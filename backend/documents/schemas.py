from datetime import date, datetime

from ninja import Field, FilterSchema, ModelSchema, Schema

from .enums import SituacaoDocumento
from .models import TipoDocumento

# ---------- Tipo de documento ----------


class TipoDocumentoIn(Schema):
    nome: str = Field(max_length=100)


class TipoDocumentoUpdate(Schema):
    nome: str | None = Field(None, max_length=100)


class TipoDocumentoOut(ModelSchema):
    class Meta:
        model = TipoDocumento
        fields = ["id", "nome"]


# ---------- Documentos ----------


class DocumentoOut(Schema):
    id: int
    tipo: TipoDocumentoOut
    arquivo: str | None = None
    vencimento: date | None = None
    situacao: SituacaoDocumento
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_arquivo(obj):
        return obj.arquivo.url if obj.arquivo else None


class DocumentoClienteOut(DocumentoOut):
    cliente_id: int


class DocumentoFuncionarioOut(DocumentoOut):
    funcionario_id: int


class DocumentoClienteIn(Schema):
    cliente_id: int
    tipo_id: int
    vencimento: date | None = None


class DocumentoFuncionarioIn(Schema):
    funcionario_id: int
    tipo_id: int
    vencimento: date | None = None


class DocumentoUpdate(Schema):
    tipo_id: int | None = None
    vencimento: date | None = None


class DocumentoClienteFiltro(FilterSchema):
    cliente_id: int | None = None
    tipo_id: int | None = None
    situacao: SituacaoDocumento | None = None
    vence_ate: date | None = Field(None, q="vencimento__lte")


class DocumentoFuncionarioFiltro(FilterSchema):
    funcionario_id: int | None = None
    tipo_id: int | None = None
    situacao: SituacaoDocumento | None = None
    vence_ate: date | None = Field(None, q="vencimento__lte")


class DocumentoVeiculoOut(DocumentoOut):
    veiculo_id: int


class DocumentoVeiculoIn(Schema):
    veiculo_id: int
    tipo_id: int
    vencimento: date | None = None


class DocumentoVeiculoFiltro(FilterSchema):
    veiculo_id: int | None = None
    tipo_id: int | None = None
    situacao: SituacaoDocumento | None = None
    vence_ate: date | None = Field(None, q="vencimento__lte")
