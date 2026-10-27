from datetime import date
from decimal import Decimal

from ninja import Field, Schema
from pydantic import ConfigDict

from .enums import StatusContaPagar, StatusContaReceber


class _Entrada(Schema):
    # Tira os espaços do começo e do fim de todos os textos recebidos.
    model_config = ConfigDict(str_strip_whitespace=True)


# --- Receitas e despesas (têm os mesmos campos) ---


class _LancamentoIn(_Entrada):
    descricao: str = Field(min_length=1, max_length=200)
    categoria: str = Field(min_length=1, max_length=60)
    # Mesmo limite do DecimalField(max_digits=12, decimal_places=2) do model.
    valor: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    data: date


class _LancamentoUpdate(_Entrada):
    descricao: str | None = Field(default=None, min_length=1, max_length=200)
    categoria: str | None = Field(default=None, min_length=1, max_length=60)
    valor: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    data: date | None = None


class _LancamentoOut(Schema):
    id: int
    descricao: str
    categoria: str
    valor: float
    data: date


class ReceitaIn(_LancamentoIn):
    pass


class ReceitaUpdate(_LancamentoUpdate):
    pass


class ReceitaOut(_LancamentoOut):
    pass


class DespesaIn(_LancamentoIn):
    pass


class DespesaUpdate(_LancamentoUpdate):
    pass


class DespesaOut(_LancamentoOut):
    pass


# --- Contas a receber ---


class ContaReceberIn(_Entrada):
    receita_id: int = Field(gt=0)
    venda_id: int | None = Field(default=None, gt=0)
    descricao: str = Field(min_length=1, max_length=200)
    valor: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    data_vencimento: date
    data_recebimento: date | None = None
    status: StatusContaReceber = StatusContaReceber.PENDENTE


class ContaReceberUpdate(_Entrada):
    receita_id: int | None = Field(default=None, gt=0)
    venda_id: int | None = Field(default=None, gt=0)
    descricao: str | None = Field(default=None, min_length=1, max_length=200)
    valor: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    data_vencimento: date | None = None
    data_recebimento: date | None = None
    status: StatusContaReceber | None = None


class ContaReceberOut(Schema):
    id: int
    receita_id: int
    receita: str
    categoria: str
    venda_id: int | None = None
    descricao: str
    valor: float
    data_vencimento: date
    data_recebimento: date | None = None
    status: str

    @staticmethod
    def resolve_receita(obj):
        return obj.receita.descricao

    @staticmethod
    def resolve_categoria(obj):
        return obj.receita.categoria


# --- Contas a pagar ---


class ContaPagarIn(_Entrada):
    despesa_id: int = Field(gt=0)
    compra_id: int | None = Field(default=None, gt=0)
    descricao: str = Field(min_length=1, max_length=200)
    valor: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    data_vencimento: date
    data_pagamento: date | None = None
    status: StatusContaPagar = StatusContaPagar.PENDENTE


class ContaPagarUpdate(_Entrada):
    despesa_id: int | None = Field(default=None, gt=0)
    compra_id: int | None = Field(default=None, gt=0)
    descricao: str | None = Field(default=None, min_length=1, max_length=200)
    valor: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    data_vencimento: date | None = None
    data_pagamento: date | None = None
    status: StatusContaPagar | None = None


class ContaPagarOut(Schema):
    id: int
    despesa_id: int
    despesa: str
    categoria: str
    compra_id: int | None = None
    descricao: str
    valor: float
    data_vencimento: date
    data_pagamento: date | None = None
    status: str

    @staticmethod
    def resolve_despesa(obj):
        return obj.despesa.descricao

    @staticmethod
    def resolve_categoria(obj):
        return obj.despesa.categoria
