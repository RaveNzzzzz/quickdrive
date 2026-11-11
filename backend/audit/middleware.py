import hashlib
import hmac
import json
import logging
import re
import time
import uuid
from http import HTTPMethod

from django.conf import settings
from django.db import DatabaseError
from django.utils import timezone
from ninja_jwt.exceptions import TokenError
from ninja_jwt.settings import api_settings
from ninja_jwt.tokens import AccessToken, UntypedToken

from .models import RegistroRequisicao

logger = logging.getLogger(__name__)
MAX_JSON_BYTES = 64 * 1024
MEDIA_TYPES = {
    "application/json", "application/x-www-form-urlencoded", "multipart/form-data",
    "text/html", "text/plain", "application/pdf", "application/octet-stream",
}
NUMERIC_FIELDS = {
    "id", "produto_id", "lote_id", "categoria_id", "compra_id", "venda_id", "conta_id",
    "despesa_id", "receita_id", "cliente_id", "veiculo_id", "funcionario_id",
    "count", "limit", "offset", "page", "quantidade",
}
MONEY_FIELDS = {"valor", "valor_compra", "valor_venda", "valor_unitario"}
DATE_FIELDS = {"data_compra", "data_venda", "data_pagamento", "data_recebimento", "data_vencimento", "data_validade"}
STATUSES = {"pendente", "pago", "recebido", "cancelado", "cancelada", "concluida"}
TOKEN_ROUTES = {"token_obtain_pair", "token_refresh", "token_verify"}


def _media_type(value):
    media = value.partition(";")[0].strip().lower()
    return media if media in MEDIA_TYPES else ("outro" if media else "")


def _size(value):
    if len(value) <= 18 and value.isascii() and value.isdecimal():
        return int(value)
    return None


def _read_json(body, media):
    if media == "application/json" and 0 < len(body) <= MAX_JSON_BYTES:
        try:
            return json.loads(body)
        except (ValueError, RecursionError):
            pass
    return None


def _safe_fields(data):
    # A lista é deliberadamente fechada: valores livres podem conter segredos ou dados pessoais.
    result = {}
    for field in NUMERIC_FIELDS:
        value = data.get(field)
        if type(value) is int and 0 <= value < 2**63:
            result[field] = value
        elif isinstance(value, str) and (number := _size(value)) is not None:
            result[field] = number
    for field in MONEY_FIELDS:
        value = data.get(field)
        if type(value) in (str, int, float) and re.fullmatch(r"[0-9]{1,10}(\.[0-9]{1,2})?", str(value)):
            result[field] = str(value)
    for field in DATE_FIELDS:
        value = data.get(field)
        if isinstance(value, str) and re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
            result[field] = value
    status = data.get("status")
    if isinstance(status, str) and status in STATUSES:
        result["status"] = status
    return result


def _summary(data):
    if isinstance(data, list):
        return {"tipo": "lista", "quantidade": len(data)}
    if not isinstance(data, dict):
        return {}
    summary = {"tipo": "objeto", "campos": _safe_fields(data)}
    if isinstance(data.get("items"), list):
        summary["quantidade_itens"] = len(data["items"])
    if "detail" in data:
        detail = data["detail"]
        summary["tem_detalhe"] = True
        if isinstance(detail, list):
            summary["quantidade_erros"] = len(detail)
    return summary


def _token_id(token):
    return hmac.new(settings.SECRET_KEY.encode(), token.encode(), hashlib.sha256).hexdigest()


def _signed_user_id(raw, token_class):
    try:
        user_id = token_class(raw).get(api_settings.USER_ID_CLAIM)
    except TokenError:
        return None
    return user_id if type(user_id) is int and 0 < user_id < 2**63 else None


def _as_token(value):
    return value if isinstance(value, str) and 0 < len(value) <= 8192 else ""


def _identity(request, route_name, status, submitted, returned):
    scheme, _, credentials = request.headers.get("Authorization", "").partition(" ")
    token = _as_token(credentials.strip()) if scheme.lower() == "bearer" else ""
    user = getattr(request, "user", None)
    if token:
        user_id = user.pk if getattr(request, "auth", None) and getattr(user, "is_authenticated", False) else None
        return user_id or _signed_user_id(token, AccessToken), _token_id(token)
    if route_name in TOKEN_ROUTES and 200 <= status < 300:
        outgoing = _as_token(returned.get("access")) if isinstance(returned, dict) else ""
        submitted = submitted if isinstance(submitted, dict) else {}
        if route_name == "token_verify":
            verified = _as_token(submitted.get("token"))
            if verified:
                return _signed_user_id(verified, UntypedToken), _token_id(verified)
        if outgoing:
            incoming = _as_token(submitted.get("refresh")) if route_name == "token_refresh" else ""
            return _signed_user_id(outgoing, AccessToken), _token_id(incoming or outgoing)
    return (user.pk if getattr(user, "is_authenticated", False) else None), ""


class RequestAuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        event_id = uuid.uuid4()
        started_at = timezone.now()
        start = time.monotonic_ns()
        response = self.get_response(request)
        response["X-Request-ID"] = str(event_id)
        try:
            self._record(request, response, event_id, started_at, (time.monotonic_ns() - start) // 1_000_000)
        except DatabaseError:
            # Uma falha de escrita na auditoria não deve substituir a resposta original.
            logger.error("Não foi possível gravar o registro de requisição %s.", event_id)
        return response

    @staticmethod
    def process_exception(request, exception):
        request.audit_exception = type(exception).__name__
        return None

    @staticmethod
    def _record(request, response, event_id, started_at, duration):
        match = request.resolver_match
        request_media = _media_type(request.content_type or "")
        response_media = _media_type(response.get("Content-Type", ""))
        body = b"" if response.streaming else response.content
        # Usa somente o JSON já lido pela view. Não consome o stream nem abre uploads.
        submitted = _read_json(getattr(request, "_body", b""), request_media)
        returned = _read_json(body, response_media)
        user_id, fingerprint = _identity(
            request, match.url_name if match else None, response.status_code, submitted, returned
        )
        result = {
            "tipo_conteudo": response_media,
            "tamanho_bytes": _size(response.get("Content-Length", "")) if response.streaming else len(body),
            "streaming": response.streaming,
            "json": _summary(returned),
        }
        if exception := getattr(request, "audit_exception", None):
            result["tipo_excecao"] = exception
        RegistroRequisicao.objects.create(
            id=event_id,
            timestamp=started_at,
            metodo=request.method if request.method in HTTPMethod.__members__ else "OUTRO",
            rota=(match.route or "/")[:512] if match else "(sem rota resolvida)",
            status_http=response.status_code,
            duracao_ms=min(duration, 2_147_483_647),
            usuario_id=user_id,
            token_fingerprint=fingerprint,
            requisicao={
                "tipo_conteudo": request_media,
                "tamanho_bytes": _size(request.headers.get("Content-Length", "")),
                "query": _safe_fields(request.GET),
                "parametros_rota": _safe_fields(match.kwargs) if match else {},
                "json": _summary(submitted),
            },
            resultado=result,
        )
