from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from ninja.pagination import paginate

from accounts.authentication import JWTAuth
from customers.models import Cliente
from employees.models import Funcionario
from stock.models import Lote
from vehicles.enums import StatusVeiculo
from vehicles.models import Veiculo

from .enums import ItemCompra, StatusCompra, StatusVenda
from .models import Compra, Venda
from .schemas import CompraIn, CompraOut, CompraUpdate, VendaIn, VendaOut, VendaUpdate

vendas_router = Router(tags=["vendas"], auth=JWTAuth())
compras_router = Router(tags=["compras"], auth=JWTAuth())

# Campo de FK recebido no JSON -> (model, mensagem quando o id não existe)
RELACIONADOS = {
    "veiculo_id": (Veiculo, "Veículo não encontrado."),
    "cliente_id": (Cliente, "Cliente não encontrado."),
    "funcionario_id": (Funcionario, "Funcionário não encontrado."),
    "lote_id": (Lote, "Lote não encontrado."),
}
VEICULO_JA_VENDIDO = "Este veículo já tem uma venda ativa."


def _conferir_relacionados(dados: dict):
    for campo, (modelo, mensagem) in RELACIONADOS.items():
        valor = dados.get(campo)
        if valor is not None and not modelo.objects.filter(id=valor).exists():
            raise HttpError(404, mensagem)


def _dados_update(payload, anulaveis: tuple[str, ...] = ()) -> dict:
    # Só os campos enviados no PATCH. "null" só é aceito nos campos opcionais do model.
    dados = payload.dict(exclude_unset=True)
    for campo, valor in dados.items():
        if valor is None and campo not in anulaveis:
            raise HttpError(422, f"O campo {campo} não pode ficar vazio.")
    return dados


def _validar(objeto):
    # Roda as regras do clean() do model e devolve a mensagem como texto (o front mostra o "detail").
    try:
        objeto.clean()
    except ValidationError as erro:
        raise HttpError(422, " ".join(erro.messages))


# --- Vendas ---


def _vendas():
    return Venda.objects.select_related("veiculo__marca", "cliente__pessoa", "funcionario__pessoa")


def _checar_veiculo_livre(veiculo_id: int, ignorar_id: int | None = None):
    ativas = Venda.objects.filter(veiculo_id=veiculo_id).exclude(status=StatusVenda.CANCELADA)
    if ignorar_id is not None:
        ativas = ativas.exclude(id=ignorar_id)
    if ativas.exists():
        raise HttpError(409, VEICULO_JA_VENDIDO)


def _marcar_veiculo(veiculo_id: int, vendido: bool):
    # Venda ativa tira o carro do pátio; venda cancelada ou excluída devolve o carro ao pátio.
    status = StatusVeiculo.VENDIDO if vendido else StatusVeiculo.DISPONIVEL
    Veiculo.objects.filter(id=veiculo_id).update(status=status)


@vendas_router.get("", response=list[VendaOut])
@paginate
def listar_vendas(request, status: StatusVenda | None = None):
    qs = _vendas().order_by("-data_venda", "-id")
    if status is not None:
        qs = qs.filter(status=status)
    return qs


@vendas_router.post("", response={201: VendaOut})
def criar_venda(request, payload: VendaIn):
    dados = payload.dict()
    _conferir_relacionados(dados)
    ativa = dados["status"] != StatusVenda.CANCELADA
    if ativa:
        _checar_veiculo_livre(dados["veiculo_id"])
    try:
        with transaction.atomic():
            venda = Venda.objects.create(**dados)
            if ativa:
                _marcar_veiculo(venda.veiculo_id, vendido=True)
    except IntegrityError:
        # Duas pessoas venderam o mesmo carro ao mesmo tempo (constraint venda_ativa_unica_por_veiculo).
        raise HttpError(409, VEICULO_JA_VENDIDO)
    return 201, _vendas().get(pk=venda.pk)


@vendas_router.get("/{int:venda_id}", response=VendaOut)
def obter_venda(request, venda_id: int):
    return get_object_or_404(_vendas(), id=venda_id)


@vendas_router.patch("/{int:venda_id}", response=VendaOut)
def atualizar_venda(request, venda_id: int, payload: VendaUpdate):
    dados = _dados_update(payload)
    _conferir_relacionados(dados)
    try:
        with transaction.atomic():
            venda = get_object_or_404(Venda.objects.select_for_update(), id=venda_id)
            estava_ativa = venda.status != StatusVenda.CANCELADA
            for campo, valor in dados.items():
                setattr(venda, campo, valor)
            ativa = venda.status != StatusVenda.CANCELADA
            if ativa and not estava_ativa:  # venda cancelada sendo reativada
                _checar_veiculo_livre(venda.veiculo_id, ignorar_id=venda.id)
            venda.save()
            if ativa != estava_ativa:
                _marcar_veiculo(venda.veiculo_id, vendido=ativa)
    except IntegrityError:
        raise HttpError(409, VEICULO_JA_VENDIDO)
    return _vendas().get(pk=venda.pk)


@vendas_router.delete("/{int:venda_id}", response={204: None})
def excluir_venda(request, venda_id: int):
    # Se a venda tiver contas a receber, o PROTECT impede a exclusão (409 pelo handler de config/api.py).
    with transaction.atomic():
        venda = get_object_or_404(Venda.objects.select_for_update(), id=venda_id)
        ativa = venda.status != StatusVenda.CANCELADA
        venda.delete()
        if ativa:
            _marcar_veiculo(venda.veiculo_id, vendido=False)
    return 204, None


# --- Compras ---

COMPRA_ANULAVEIS = ("cliente_id", "veiculo_id", "lote_id")


def _compras():
    return Compra.objects.select_related(
        "funcionario__pessoa", "cliente__pessoa", "veiculo__marca", "lote__produto"
    )


@compras_router.get("", response=list[CompraOut])
@paginate
def listar_compras(request, status: StatusCompra | None = None, item_compra: ItemCompra | None = None):
    qs = _compras().order_by("-data_compra", "-id")
    if status is not None:
        qs = qs.filter(status=status)
    if item_compra is not None:
        qs = qs.filter(item_compra=item_compra)
    return qs


@compras_router.post("", response={201: CompraOut})
def criar_compra(request, payload: CompraIn):
    dados = payload.dict()
    _conferir_relacionados(dados)
    compra = Compra(**dados)
    _validar(compra)
    compra.save()
    return 201, _compras().get(pk=compra.pk)


@compras_router.get("/{int:compra_id}", response=CompraOut)
def obter_compra(request, compra_id: int):
    return get_object_or_404(_compras(), id=compra_id)


@compras_router.patch("/{int:compra_id}", response=CompraOut)
def atualizar_compra(request, compra_id: int, payload: CompraUpdate):
    dados = _dados_update(payload, anulaveis=COMPRA_ANULAVEIS)
    _conferir_relacionados(dados)
    with transaction.atomic():
        compra = get_object_or_404(Compra.objects.select_for_update(), id=compra_id)
        for campo, valor in dados.items():
            setattr(compra, campo, valor)
        _validar(compra)
        compra.save()
    return _compras().get(pk=compra.pk)


@compras_router.delete("/{int:compra_id}", response={204: None})
def excluir_compra(request, compra_id: int):
    # Se a compra tiver contas a pagar, o PROTECT impede a exclusão (409 pelo handler de config/api.py).
    compra = get_object_or_404(Compra, id=compra_id)
    compra.delete()
    return 204, None
