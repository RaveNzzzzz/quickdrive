from datetime import datetime

from ninja import Field, FilterSchema, ModelSchema, Schema

from .enums import ImportanciaNotificacao
from .models import RegraNotificacao

# ---------- Notificação ----------


class NotificacaoIn(Schema):
    titulo: str = Field(max_length=150)
    mensagem: str
    tipo: str = Field(max_length=50)
    importancia: ImportanciaNotificacao = ImportanciaNotificacao.MEDIA

    funcionarios_ids: list[int] = []
    todos_ativos: bool = False


class NotificacaoBase(Schema):
    id: int
    titulo: str
    mensagem: str
    tipo: str
    importancia: ImportanciaNotificacao
    created_at: datetime


class NotificacaoOut(NotificacaoBase):
    total_destinatarios: int
    total_lidas: int


class DestinatarioOut(Schema):
    id: int
    funcionario_id: int
    funcionario_nome: str
    lida: bool
    lida_em: datetime | None = None

    @staticmethod
    def resolve_funcionario_nome(obj):
        return obj.funcionario.pessoa.nome


class NotificacaoDetalheOut(NotificacaoOut):
    destinatarios: list[DestinatarioOut]

    @staticmethod
    def resolve_destinatarios(obj):
        return list(obj.destinatarios.all())


class NotificacaoFiltro(FilterSchema):
    tipo: str | None = None
    importancia: ImportanciaNotificacao | None = None
    busca: str | None = Field(None, q="titulo__icontains")


# ---------- Caixa de entrada ----------


class CaixaOut(Schema):
    id: int
    lida: bool
    lida_em: datetime | None = None
    notificacao: NotificacaoBase


class CaixaFiltro(FilterSchema):
    lida: bool | None = None
    tipo: str | None = Field(None, q="notificacao__tipo")
    importancia: ImportanciaNotificacao | None = Field(
        None, q="notificacao__importancia"
    )


class ContadorOut(Schema):
    total: int


class RegraOut(ModelSchema):
    setores_destino_ids: list[int]

    class Meta:
        model = RegraNotificacao
        fields = ["id", "tipo", "ativa", "dias", "importancia"]

    @staticmethod
    def resolve_setores_destino_ids(obj):
        return [s.id for s in obj.setores_destino.all()]


class RegraUpdate(Schema):
    ativa: bool | None = None
    dias: int | None = Field(None, ge=0)
    importancia: ImportanciaNotificacao | None = None
    setores_destino_ids: list[int] | None = None
