from datetime import date

from ninja import Field, ModelSchema, Schema
from pydantic import EmailStr

from .enums import UF, TipoPessoa
from .models import Endereco, Pessoa

TELEFONE = r"^\d{10,11}$"
CEP = r"^\d{8}$"
DOCUMENTO = r"^(\d{11}|\d{14})$"


# ---------- Endereço ----------


class EnderecoIn(Schema):
    rua: str = Field(max_length=200)
    numero: str = Field(max_length=20)
    complemento: str = Field("", max_length=200)
    bairro: str = Field(max_length=100)
    cidade: str = Field(max_length=100)
    uf: UF
    cep: str = Field(pattern=CEP)


class EnderecoUpdate(Schema):
    rua: str | None = Field(None, max_length=200)
    numero: str | None = Field(None, max_length=20)
    complemento: str | None = Field(None, max_length=200)
    bairro: str | None = Field(None, max_length=100)
    cidade: str | None = Field(None, max_length=100)
    uf: UF | None = None
    cep: str | None = Field(None, pattern=CEP)


class EnderecoOut(ModelSchema):
    class Meta:
        model = Endereco
        fields = ["id", "rua", "numero", "complemento", "bairro", "cidade", "uf", "cep"]


# ---------- Pessoa ----------


class PessoaIn(Schema):
    nome: str = Field(max_length=200)
    email: EmailStr
    telefone: str = Field(pattern=TELEFONE)
    data_nascimento: date | None = None
    cpf_cnpj: str = Field(pattern=DOCUMENTO)
    tipo_pessoa: TipoPessoa = TipoPessoa.FISICA

    endereco: EnderecoIn


class PessoaUpdate(Schema):
    nome: str | None = Field(None, max_length=200)
    email: EmailStr | None = None
    telefone: str | None = Field(None, pattern=TELEFONE)
    data_nascimento: date | None = None
    cpf_cnpj: str | None = Field(None, pattern=DOCUMENTO)

    endereco: EnderecoUpdate | None = None


class PessoaOut(ModelSchema):
    endereco: EnderecoOut | None = None

    class Meta:
        model = Pessoa
        fields = ["id", "nome", "email", "telefone", "data_nascimento", "cpf_cnpj", "tipo_pessoa"]

    @staticmethod
    def resolve_endereco(obj):
        return getattr(obj, "endereco", None)
