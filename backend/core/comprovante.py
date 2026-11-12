"""Envio, download e remoção de comprovantes de pagamento (usado por contas a receber, a pagar e compras)."""
from io import BytesIO
from pathlib import PurePath
from urllib.parse import quote

from django.http import HttpResponse
from django.utils import timezone
from ninja import UploadedFile
from ninja.errors import HttpError
from PIL import Image, UnidentifiedImageError

COMPROVANTE_MAX_MB = 5
FORMATOS_IMAGEM = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
CAMPOS = ["comprovante", "comprovante_nome", "comprovante_tipo", "comprovante_em", "updated_at"]


def _tipo_do_conteudo(conteudo: bytes) -> str:
    """Descobre o tipo pelo conteúdo (não confia na extensão nem no tipo informado pelo navegador)."""
    if conteudo[:5] == b"%PDF-":
        return "application/pdf"
    try:
        with Image.open(BytesIO(conteudo)) as img:
            tipo = FORMATOS_IMAGEM.get(img.format or "")
            if tipo:
                img.verify()
                return tipo
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        pass
    raise HttpError(422, "Envie uma foto (JPG, PNG ou WEBP) ou um PDF.")


def guardar(objeto, arquivo: UploadedFile) -> None:
    """Valida o arquivo e grava como comprovante do objeto (substitui o anterior)."""
    if arquivo.size > COMPROVANTE_MAX_MB * 1024 * 1024:
        raise HttpError(422, f"O comprovante deve ter no máximo {COMPROVANTE_MAX_MB} MB.")
    conteudo = arquivo.read()
    objeto.comprovante = conteudo
    objeto.comprovante_tipo = _tipo_do_conteudo(conteudo)
    objeto.comprovante_nome = PurePath(arquivo.name or "comprovante").name[:255] or "comprovante"
    objeto.comprovante_em = timezone.now()
    objeto.save(update_fields=CAMPOS)


def limpar(objeto) -> None:
    objeto.comprovante = b""
    objeto.comprovante_nome = ""
    objeto.comprovante_tipo = ""
    objeto.comprovante_em = None
    objeto.save(update_fields=CAMPOS)


def resposta(objeto) -> HttpResponse:
    if not objeto.comprovante_tipo:
        raise HttpError(404, "Não há comprovante anexado.")
    http = HttpResponse(bytes(objeto.comprovante), content_type=objeto.comprovante_tipo)
    http["Content-Disposition"] = "inline; filename*=UTF-8''" + quote(objeto.comprovante_nome)
    http["X-Content-Type-Options"] = "nosniff"
    return http
