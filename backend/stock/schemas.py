# Schemas de entrada, atualização e saída do estoque serão definidos aqui.
from datetime import date

from ninja import Field, Schema

class CategoriaProdutoIn(Schema):
    nome: str = Field(min_length=1, max_length=100)

class ProdutoIn(Schema):
    nome: str = Field(min_length=1, max_length=100)
    especificacao: str = ""
    categoria_id: int = Field(gt=0) #Garante que o id da categoria seja maior que 0, evitando valores inválidos.

class LoteIn(Schema):
    quantidade: int = Field(ge=0) #Garante que a quantidade seja maior ou igual a 0, evitando valores negativos.
    data_validade: date | None = None
    numero_lote: str = Field(min_length=1, max_length=50) #Garante que o número do lote tenha pelo menos 1 caractere e no máximo 50 caracteres.
    produto_id: int = Field(gt=0)

class CategoriaProdutoOut(Schema):
    id: int
    nome: str

class ProdutoOut(Schema):
    id: int
    nome: str
    especificacao: str
    categoria_id: int

class LoteOut(Schema):
    id: int
    quantidade: int
    data_validade: date | None = None
    numero_lote: str
    produto_id: int

class CategoriaProdutoUpdate(Schema):
    nome: str | None = Field(default=None, min_length=1, max_length=100)

class ProdutoUpdate(Schema):
    nome: str | None = Field(default=None, min_length=1, max_length=100)
    especificacao: str | None = None
    categoria_id: int | None = Field(default=None, gt=0)

class LoteUpdate(Schema):
    quantidade: int | None = Field(default=None, ge=0)
    data_validade: date | None = None
    numero_lote: str | None = Field(default=None, min_length=1, max_length=50)
