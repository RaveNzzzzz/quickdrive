from datetime import datetime

from ninja import Field, FilterSchema, ModelSchema, Schema

from people.enums import TipoPessoa
from people.schemas import PessoaIn, PessoaOut, PessoaUpdate

from .models import Cliente


class ClienteIn(Schema):
    pessoa: PessoaIn


class ClienteUpdate(Schema):
    pessoa: PessoaUpdate | None = None


class ClienteOut(ModelSchema):
    pessoa: PessoaOut

    class Meta:
        model = Cliente
        fields = ["id", "codigo", "ativo", "ultima_interacao", "created_at"]


class ClienteFiltro(FilterSchema):
    ativo: bool | None = True
    tipo_pessoa: TipoPessoa | None = Field(None, q="pessoa__tipo_pessoa")
    busca: str | None = Field(
        None,
        q=[
            "pessoa__nome__icontains",
            "pessoa__email__icontains",
            "pessoa__cpf_cnpj__icontains",
            "codigo__icontains",
        ],
    )
