from datetime import date, time
from decimal import Decimal
from typing import Literal

from ninja import Field, FilterSchema, ModelSchema, Schema

from people.schemas import PessoaIn, PessoaOut, PessoaUpdate

from .enums import TipoConta, TipoContratacao
from .models import Cargo, Desligamento, Funcionario, Setor

# ---------- Setor ----------


class SetorIn(Schema):
    nome: str


class SetorUpdate(Schema):
    nome: str | None = None


class SetorOut(ModelSchema):
    class Meta:
        model = Setor
        fields = ["id", "nome"]


# ---------- Cargo ----------


class CargoIn(Schema):
    papel_acesso: Literal['COMUM', 'GERENTE', 'ADMINISTRADOR'] = 'COMUM'
    nome: str
    descricao: str = ""
    setor_id: int


class CargoUpdate(Schema):
    papel_acesso: Literal['COMUM', 'GERENTE', 'ADMINISTRADOR'] | None = None
    nome: str | None = None
    descricao: str | None = None
    setor_id: int | None = None


class CargoOut(ModelSchema):
    setor: SetorOut

    class Meta:
        model = Cargo
        fields = ["id", "nome", "descricao", "papel_acesso"]


# ---------- Desligamento ----------


class DesligamentoIn(Schema):
    data_desligamento: date
    motivo: str = Field(max_length=200)
    observacoes: str = ""


class DesligamentoOut(ModelSchema):
    class Meta:
        model = Desligamento
        fields = ["id", "data_desligamento", "motivo", "observacoes"]


# ---------- Funcionário ----------


class FuncionarioIn(Schema):
    pessoa: PessoaIn

    cargo_id: int
    salario: Decimal
    comissao: Decimal = Decimal("0")
    data_admissao: date
    inicio_expediente: time
    final_expediente: time
    regime_contratacao: TipoContratacao
    banco: str
    agencia: str
    numero_conta: str
    tipo_conta: TipoConta
    chave_pix: str = ""


class FuncionarioUpdate(Schema):
    pessoa: PessoaUpdate | None = None

    cargo_id: int | None = None
    salario: Decimal | None = None
    comissao: Decimal | None = None
    data_admissao: date | None = None
    inicio_expediente: time | None = None
    final_expediente: time | None = None
    regime_contratacao: TipoContratacao | None = None
    banco: str | None = None
    agencia: str | None = None
    numero_conta: str | None = None
    tipo_conta: TipoConta | None = None
    chave_pix: str | None = None


class FuncionarioOut(ModelSchema):
    pessoa: PessoaOut
    cargo: CargoOut
    desligamento: DesligamentoOut | None = None

    class Meta:
        model = Funcionario
        fields = [
            "id",
            "codigo",
            "ativo",
            "salario",
            "comissao",
            "data_admissao",
            "inicio_expediente",
            "final_expediente",
            "regime_contratacao",
            "banco",
            "agencia",
            "numero_conta",
            "tipo_conta",
            "chave_pix",
            "created_at",
        ]

    @staticmethod
    def resolve_desligamento(obj):
        return getattr(obj, "desligamento", None)


class FuncionarioFiltro(FilterSchema):
    # Por padrão lista só ativos. Use ?ativo=false para ver os desligados.
    ativo: bool | None = True
    regime_contratacao: TipoContratacao | None = None
    cargo_id: int | None = None
    setor_id: int | None = Field(None, q="cargo__setor_id")
    busca: str | None = Field(
        None,
        q=[
            "pessoa__nome__icontains",
            "pessoa__email__icontains",
            "pessoa__cpf_cnpj__icontains",
            "codigo__icontains",
        ],
    )
