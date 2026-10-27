from datetime import date
from decimal import Decimal

from ninja import Field, Schema
from pydantic import ConfigDict

from .enums import FormaPagamento, ItemCompra, StatusCompra, StatusVenda


class _Entrada(Schema):
    # Tira os espaços do começo e do fim de todos os textos recebidos.
    model_config = ConfigDict(str_strip_whitespace=True)


# --- Vendas ---


class VendaIn(_Entrada):
    veiculo_id: int = Field(gt=0)
    cliente_id: int = Field(gt=0)
    funcionario_id: int = Field(gt=0)
    # Mesmo limite do DecimalField(max_digits=12, decimal_places=2) do model.
    valor_venda: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    forma_pagamento: FormaPagamento
    status: StatusVenda = StatusVenda.PENDENTE
    data_venda: date


class VendaUpdate(_Entrada):
    # O veículo não muda: para vender outro carro, cancele esta venda e crie uma nova.
    cliente_id: int | None = Field(default=None, gt=0)
    funcionario_id: int | None = Field(default=None, gt=0)
    valor_venda: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    forma_pagamento: FormaPagamento | None = None
    status: StatusVenda | None = None
    data_venda: date | None = None


class VendaOut(Schema):
    id: int
    veiculo_id: int
    veiculo: str
    placa: str
    cliente_id: int
    cliente: str
    funcionario_id: int
    funcionario: str
    valor_venda: float
    forma_pagamento: str
    status: str
    data_venda: date

    @staticmethod
    def resolve_veiculo(obj):
        return f"{obj.veiculo.marca.nome} {obj.veiculo.modelo}"

    @staticmethod
    def resolve_placa(obj):
        return obj.veiculo.placa

    @staticmethod
    def resolve_cliente(obj):
        return obj.cliente.pessoa.nome

    @staticmethod
    def resolve_funcionario(obj):
        return obj.funcionario.pessoa.nome


# --- Compras ---


class CompraIn(_Entrada):
    funcionario_id: int = Field(gt=0)
    cliente_id: int | None = Field(default=None, gt=0)
    item_compra: ItemCompra
    veiculo_id: int | None = Field(default=None, gt=0)
    lote_id: int | None = Field(default=None, gt=0)
    valor_compra: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    forma_pagamento: FormaPagamento
    status: StatusCompra = StatusCompra.PENDENTE
    data_compra: date


class CompraUpdate(_Entrada):
    funcionario_id: int | None = Field(default=None, gt=0)
    cliente_id: int | None = Field(default=None, gt=0)
    item_compra: ItemCompra | None = None
    veiculo_id: int | None = Field(default=None, gt=0)
    lote_id: int | None = Field(default=None, gt=0)
    valor_compra: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    forma_pagamento: FormaPagamento | None = None
    status: StatusCompra | None = None
    data_compra: date | None = None


class CompraOut(Schema):
    id: int
    funcionario_id: int
    funcionario: str
    cliente_id: int | None = None
    cliente: str | None = None
    item_compra: str
    veiculo_id: int | None = None
    veiculo: str | None = None
    lote_id: int | None = None
    lote: str | None = None
    valor_compra: float
    forma_pagamento: str
    status: str
    data_compra: date

    @staticmethod
    def resolve_funcionario(obj):
        return obj.funcionario.pessoa.nome

    @staticmethod
    def resolve_cliente(obj):
        return obj.cliente.pessoa.nome if obj.cliente else None

    @staticmethod
    def resolve_veiculo(obj):
        return f"{obj.veiculo.marca.nome} {obj.veiculo.modelo} ({obj.veiculo.placa})" if obj.veiculo else None

    @staticmethod
    def resolve_lote(obj):
        return f"{obj.lote.produto.nome} · lote {obj.lote.numero_lote}" if obj.lote else None
