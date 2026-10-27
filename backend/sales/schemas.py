from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from ninja import Field, Schema
from pydantic import ConfigDict

from .enums import (
    EtapaNegociacao,
    FormaPagamento,
    ItemCompra,
    MotivoPerda,
    OrigemNegociacao,
    StatusCompra,
    StatusVenda,
)

# Telefone só com números (DDD + número), igual ao cadastro de pessoas. Vazio = não informado.
TELEFONE_OPCIONAL = r"^(\d{10,11})?$"


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


# --- Funil de vendas (negociações) ---


class NegociacaoIn(_Entrada):
    nome_interessado: str = Field(min_length=1, max_length=200)
    telefone: str = Field("", pattern=TELEFONE_OPCIONAL)
    cliente_id: int | None = Field(default=None, gt=0)
    veiculo_id: int | None = Field(default=None, gt=0)
    # Sem informar, a negociação fica com o funcionário logado.
    funcionario_id: int | None = Field(default=None, gt=0)
    # Uma negociação nasce aberta: Vendido e Perdido só por "ganhar" e "mover".
    etapa: Literal["interesse", "test_drive", "negociacao", "credito"] = "interesse"
    origem: OrigemNegociacao = OrigemNegociacao.OUTRO
    valor_proposta: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    proximo_passo: str = Field("", max_length=200)
    proximo_contato: date | None = None


class NegociacaoUpdate(_Entrada):
    # A etapa não muda por aqui: use /mover (ou /ganhar para Vendido).
    nome_interessado: str | None = Field(default=None, min_length=1, max_length=200)
    telefone: str | None = Field(default=None, pattern=TELEFONE_OPCIONAL)
    cliente_id: int | None = Field(default=None, gt=0)
    veiculo_id: int | None = Field(default=None, gt=0)
    funcionario_id: int | None = Field(default=None, gt=0)
    origem: OrigemNegociacao | None = None
    valor_proposta: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    proximo_passo: str | None = Field(default=None, max_length=200)
    proximo_contato: date | None = None


class NegociacaoMover(Schema):
    etapa: EtapaNegociacao
    # Id do cartão que fica logo abaixo na coluna de destino (None = vai para o fim da coluna).
    antes_de: int | None = None
    # Obrigatório ao mover para Perdido.
    motivo_perda: MotivoPerda | None = None


class NegociacaoGanhar(Schema):
    venda_id: int = Field(gt=0)


class NegociacaoOut(Schema):
    id: int
    # Nome do cliente cadastrado ou, enquanto não houver, do interessado.
    nome: str
    nome_interessado: str
    telefone: str
    cliente_id: int | None = None
    veiculo_id: int | None = None
    veiculo: str | None = None
    veiculo_placa: str | None = None
    veiculo_valor: float | None = None
    funcionario_id: int
    funcionario: str
    venda_id: int | None = None
    etapa: str
    etapa_desde: datetime
    ordem: int
    origem: str
    valor_proposta: float | None = None
    proximo_passo: str
    proximo_contato: date | None = None
    motivo_perda: str
    created_at: datetime

    @staticmethod
    def resolve_nome(obj):
        return obj.cliente.pessoa.nome if obj.cliente else obj.nome_interessado

    @staticmethod
    def resolve_veiculo(obj):
        return f"{obj.veiculo.marca.nome} {obj.veiculo.modelo}" if obj.veiculo else None

    @staticmethod
    def resolve_veiculo_placa(obj):
        return obj.veiculo.placa if obj.veiculo else None

    @staticmethod
    def resolve_veiculo_valor(obj):
        return float(obj.veiculo.valor) if obj.veiculo else None

    @staticmethod
    def resolve_funcionario(obj):
        return obj.funcionario.pessoa.nome


class NegociacaoEventoOut(Schema):
    id: int
    etapa_anterior: str
    etapa_nova: str
    funcionario: str | None = None
    data: datetime

    @staticmethod
    def resolve_funcionario(obj):
        return obj.funcionario.pessoa.nome if obj.funcionario else None


class AlertaFunilOut(Schema):
    # Mesmo formato dos alertas do pátio (vehicles/schemas.py), para o card da Home mostrar os dois juntos.
    tipo: Literal["contato", "funil_parado"]
    nivel: Literal["danger", "warning"]
    titulo: str
    subtitulo: str
    veiculo_id: int | None = None
