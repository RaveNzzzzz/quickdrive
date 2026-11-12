# Schemas de entrada, atualização e saída do estoque serão definidos aqui.
from datetime import date
from decimal import Decimal

from ninja import Field, Schema

class CategoriaProdutoIn(Schema):
    nome: str = Field(min_length=1, max_length=100)

class LoteInicialIn(Schema):
    """Primeiro lote, cadastrado junto com o produto."""

    quantidade: int = Field(gt=0, le=2_147_483_647)
    numero_lote: str = Field(default="", max_length=50)  # vazio = gerado automaticamente
    data_validade: date | None = None
    valor_total: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    funcionario_id: int | None = Field(default=None, gt=0)  # responsável pela compra (quando o usuário não tem vínculo)


class ProdutoIn(Schema):
    nome: str = Field(min_length=1, max_length=100)
    especificacao: str = ""
    valor_unitario: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    categoria_id: int = Field(gt=0) #Garante que o id da categoria seja maior que 0, evitando valores inválidos.
    lote: LoteInicialIn | None = None


class EntradaIn(Schema):
    """Aumentar o estoque manualmente: vira um lote novo + compra no financeiro."""

    quantidade: int = Field(gt=0, le=1_000_000)
    valor_total: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    numero_lote: str = Field(default="", max_length=50)
    data_validade: date | None = None
    motivo: str = Field(default="", max_length=200)
    funcionario_id: int | None = Field(default=None, gt=0)


class SaidaIn(Schema):
    """Diminuir o estoque manualmente (consumo, perda, ajuste)."""

    quantidade: int = Field(gt=0, le=1_000_000)
    motivo: str = Field(default="", max_length=200)

class LoteIn(Schema):
    quantidade: int = Field(gt=0, le=2_147_483_647)
    data_validade: date | None = None
    numero_lote: str = Field(min_length=1, max_length=50) #Garante que o número do lote tenha pelo menos 1 caractere e no máximo 50 caracteres.
    produto_id: int = Field(gt=0)
    funcionario_id: int | None = Field(default=None, gt=0)

class CategoriaProdutoOut(Schema):
    id: int
    nome: str

class ProdutoOut(Schema):
    id: int
    nome: str
    especificacao: str
    categoria_id: int
    valor_unitario: Decimal | None

class LoteOut(Schema):
    id: int
    quantidade: int
    data_validade: date | None = None
    numero_lote: str
    produto_id: int


class ProdutoCriadoOut(ProdutoOut):
    # Preenchido quando o produto foi criado já com um lote inicial.
    lote: LoteOut | None = None

class CategoriaProdutoUpdate(Schema):
    nome: str | None = Field(default=None, min_length=1, max_length=100)

class ProdutoUpdate(Schema):
    nome: str | None = Field(default=None, min_length=1, max_length=100)
    especificacao: str | None = None
    valor_unitario: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    categoria_id: int | None = Field(default=None, gt=0)

class LoteUpdate(Schema):
    quantidade: int | None = Field(default=None, ge=0)
    data_validade: date | None = None
    numero_lote: str | None = Field(default=None, min_length=1, max_length=50)
