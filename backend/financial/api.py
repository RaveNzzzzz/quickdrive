from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError
from ninja.pagination import paginate

from accounts.authentication import GestaoJWTAuth
from sales.models import Compra, Venda

from .enums import StatusContaPagar, StatusContaReceber
from .models import ContaPagar, ContaReceber, Despesa, Receita
from .schemas import (
    ContaPagarIn,
    ContaPagarOut,
    ContaPagarUpdate,
    ContaReceberIn,
    ContaReceberOut,
    ContaReceberUpdate,
    DespesaIn,
    DespesaOut,
    DespesaUpdate,
    ReceitaIn,
    ReceitaOut,
    ReceitaUpdate,
)

receitas_router = Router(tags=["financeiro - receitas"], auth=GestaoJWTAuth())
despesas_router = Router(tags=["financeiro - despesas"], auth=GestaoJWTAuth())
contas_receber_router = Router(tags=["financeiro - contas a receber"], auth=GestaoJWTAuth())
contas_pagar_router = Router(tags=["financeiro - contas a pagar"], auth=GestaoJWTAuth())

# Campo de FK recebido no JSON -> (model, mensagem quando o id não existe)
RELACIONADOS = {
    "receita_id": (Receita, "Receita não encontrada."),
    "despesa_id": (Despesa, "Despesa não encontrada."),
    "venda_id": (Venda, "Venda não encontrada."),
    "compra_id": (Compra, "Compra não encontrada."),
}


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


def _ajustar_data_baixa(conta, campo_data: str, status_baixa: str):
    # Marcar como pago/recebido sem informar a data usa o dia de hoje;
    # voltar para pendente ou cancelar apaga a data.
    if conta.status == status_baixa:
        if getattr(conta, campo_data) is None:
            setattr(conta, campo_data, timezone.localdate())
    else:
        setattr(conta, campo_data, None)


# --- Receitas ---


@receitas_router.get("", response=list[ReceitaOut])
@paginate
def listar_receitas(request, categoria: str | None = None):
    qs = Receita.objects.order_by("-data", "-id")
    if categoria:
        qs = qs.filter(categoria__iexact=categoria)
    return qs


@receitas_router.post("", response={201: ReceitaOut})
def criar_receita(request, payload: ReceitaIn):
    return 201, Receita.objects.create(**payload.dict())


@receitas_router.get("/{int:receita_id}", response=ReceitaOut)
def obter_receita(request, receita_id: int):
    return get_object_or_404(Receita, id=receita_id)


@receitas_router.patch("/{int:receita_id}", response=ReceitaOut)
def atualizar_receita(request, receita_id: int, payload: ReceitaUpdate):
    receita = get_object_or_404(Receita, id=receita_id)
    for campo, valor in _dados_update(payload).items():
        setattr(receita, campo, valor)
    receita.save()
    return receita


@receitas_router.delete("/{int:receita_id}", response={204: None})
def excluir_receita(request, receita_id: int):
    # Receita com contas a receber não pode ser excluída (PROTECT -> 409 pelo handler de config/api.py).
    get_object_or_404(Receita, id=receita_id).delete()
    return 204, None


# --- Despesas ---


@despesas_router.get("", response=list[DespesaOut])
@paginate
def listar_despesas(request, categoria: str | None = None):
    qs = Despesa.objects.order_by("-data", "-id")
    if categoria:
        qs = qs.filter(categoria__iexact=categoria)
    return qs


@despesas_router.post("", response={201: DespesaOut})
def criar_despesa(request, payload: DespesaIn):
    return 201, Despesa.objects.create(**payload.dict())


@despesas_router.get("/{int:despesa_id}", response=DespesaOut)
def obter_despesa(request, despesa_id: int):
    return get_object_or_404(Despesa, id=despesa_id)


@despesas_router.patch("/{int:despesa_id}", response=DespesaOut)
def atualizar_despesa(request, despesa_id: int, payload: DespesaUpdate):
    despesa = get_object_or_404(Despesa, id=despesa_id)
    for campo, valor in _dados_update(payload).items():
        setattr(despesa, campo, valor)
    despesa.save()
    return despesa


@despesas_router.delete("/{int:despesa_id}", response={204: None})
def excluir_despesa(request, despesa_id: int):
    # Despesa com contas a pagar não pode ser excluída (PROTECT -> 409 pelo handler de config/api.py).
    get_object_or_404(Despesa, id=despesa_id).delete()
    return 204, None


# --- Contas a receber ---


def _contas_receber():
    return ContaReceber.objects.select_related("receita")


@contas_receber_router.get("", response=list[ContaReceberOut])
@paginate
def listar_contas_receber(
    request,
    status: StatusContaReceber | None = None,
    receita_id: int | None = None,
    venda_id: int | None = None,
):
    qs = _contas_receber().order_by("data_vencimento", "id")
    if status is not None:
        qs = qs.filter(status=status)
    if receita_id is not None:
        qs = qs.filter(receita_id=receita_id)
    if venda_id is not None:
        qs = qs.filter(venda_id=venda_id)
    return qs


@contas_receber_router.post("", response={201: ContaReceberOut})
def criar_conta_receber(request, payload: ContaReceberIn):
    dados = payload.dict()
    _conferir_relacionados(dados)
    conta = ContaReceber(**dados)
    _ajustar_data_baixa(conta, "data_recebimento", StatusContaReceber.RECEBIDO)
    conta.save()
    return 201, _contas_receber().get(pk=conta.pk)


@contas_receber_router.get("/{int:conta_id}", response=ContaReceberOut)
def obter_conta_receber(request, conta_id: int):
    return get_object_or_404(_contas_receber(), id=conta_id)


@contas_receber_router.patch("/{int:conta_id}", response=ContaReceberOut)
def atualizar_conta_receber(request, conta_id: int, payload: ContaReceberUpdate):
    dados = _dados_update(payload, anulaveis=("venda_id", "data_recebimento"))
    _conferir_relacionados(dados)
    with transaction.atomic():
        conta = get_object_or_404(ContaReceber.objects.select_for_update(), id=conta_id)
        for campo, valor in dados.items():
            setattr(conta, campo, valor)
        _ajustar_data_baixa(conta, "data_recebimento", StatusContaReceber.RECEBIDO)
        conta.save()
    return _contas_receber().get(pk=conta.pk)


@contas_receber_router.delete("/{int:conta_id}", response={204: None})
def excluir_conta_receber(request, conta_id: int):
    get_object_or_404(ContaReceber, id=conta_id).delete()
    return 204, None


# --- Contas a pagar ---


def _contas_pagar():
    return ContaPagar.objects.select_related("despesa")


@contas_pagar_router.get("", response=list[ContaPagarOut])
@paginate
def listar_contas_pagar(
    request,
    status: StatusContaPagar | None = None,
    despesa_id: int | None = None,
    compra_id: int | None = None,
):
    qs = _contas_pagar().order_by("data_vencimento", "id")
    if status is not None:
        qs = qs.filter(status=status)
    if despesa_id is not None:
        qs = qs.filter(despesa_id=despesa_id)
    if compra_id is not None:
        qs = qs.filter(compra_id=compra_id)
    return qs


@contas_pagar_router.post("", response={201: ContaPagarOut})
def criar_conta_pagar(request, payload: ContaPagarIn):
    dados = payload.dict()
    _conferir_relacionados(dados)
    conta = ContaPagar(**dados)
    _ajustar_data_baixa(conta, "data_pagamento", StatusContaPagar.PAGO)
    conta.save()
    return 201, _contas_pagar().get(pk=conta.pk)


@contas_pagar_router.get("/{int:conta_id}", response=ContaPagarOut)
def obter_conta_pagar(request, conta_id: int):
    return get_object_or_404(_contas_pagar(), id=conta_id)


@contas_pagar_router.patch("/{int:conta_id}", response=ContaPagarOut)
def atualizar_conta_pagar(request, conta_id: int, payload: ContaPagarUpdate):
    dados = _dados_update(payload, anulaveis=("compra_id", "data_pagamento"))
    _conferir_relacionados(dados)
    with transaction.atomic():
        conta = get_object_or_404(ContaPagar.objects.select_for_update(), id=conta_id)
        for campo, valor in dados.items():
            setattr(conta, campo, valor)
        _ajustar_data_baixa(conta, "data_pagamento", StatusContaPagar.PAGO)
        conta.save()
    return _contas_pagar().get(pk=conta.pk)


@contas_pagar_router.delete("/{int:conta_id}", response={204: None})
def excluir_conta_pagar(request, conta_id: int):
    get_object_or_404(ContaPagar, id=conta_id).delete()
    return 204, None
