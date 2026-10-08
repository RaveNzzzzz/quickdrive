from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from ninja import Query, Router
from ninja.pagination import paginate
from ninja_jwt.authentication import JWTAuth

from employees.models import Funcionario
from people.services import definir, salvar

from .enums import TipoRegra
from .models import Destinatario, Notificacao
from .schemas import (
    CaixaFiltro,
    CaixaOut,
    ContadorOut,
    NotificacaoDetalheOut,
    NotificacaoFiltro,
    NotificacaoIn,
    NotificacaoOut,
    RegraOut,
    RegraUpdate,
)
from .services import criar_notificacao, marcar_lida, marcar_todas_lidas, obter_regra

router = Router(tags=["notificações"], auth=JWTAuth())


def _qs_notificacao():
    return Notificacao.objects.annotate(
        total_destinatarios=Count("destinatarios"),
        total_lidas=Count("destinatarios", filter=Q(destinatarios__lida=True)),
    )


def _qs_detalhe():
    return _qs_notificacao().prefetch_related(
        Prefetch(
            "destinatarios",
            queryset=Destinatario.objects.select_related("funcionario__pessoa"),
        )
    )


# =============== Notificações ===============


@router.get("", response=list[NotificacaoOut])
@paginate
def listar_notificacoes(request, filtros: NotificacaoFiltro = Query(...)):
    return filtros.filter(_qs_notificacao())


@router.post("", response={201: NotificacaoDetalheOut})
def criar(request, payload: NotificacaoIn):
    dados = payload.dict(exclude={"funcionarios_ids", "todos_ativos"})
    notificacao = criar_notificacao(
        dados, payload.funcionarios_ids, payload.todos_ativos
    )
    return 201, _qs_detalhe().get(pk=notificacao.pk)


@router.get("/{int:notificacao_id}", response=NotificacaoDetalheOut)
def obter_notificacao(request, notificacao_id: int):
    return get_object_or_404(_qs_detalhe(), id=notificacao_id)


@router.delete("/{int:notificacao_id}", response={204: None})
def remover_notificacao(request, notificacao_id: int):
    get_object_or_404(
        Notificacao, id=notificacao_id
    ).delete()  # destinatários caem em CASCADE
    return 204, None


# =============== Caixa de entrada do funcionário ===============


def _qs_caixa():
    return Destinatario.objects.select_related("notificacao")


@router.get("/caixa/{int:funcionario_id}", response=list[CaixaOut])
@paginate
def caixa_de_entrada(request, funcionario_id: int, filtros: CaixaFiltro = Query(...)):
    get_object_or_404(Funcionario, id=funcionario_id)
    return filtros.filter(_qs_caixa().filter(funcionario_id=funcionario_id))


@router.get("/caixa/{int:funcionario_id}/nao-lidas", response=ContadorOut)
def contar_nao_lidas(request, funcionario_id: int):
    get_object_or_404(Funcionario, id=funcionario_id)
    total = Destinatario.objects.filter(
        funcionario_id=funcionario_id, lida=False
    ).count()
    return {"total": total}


@router.post("/caixa/{int:funcionario_id}/ler-todas", response=ContadorOut)
def ler_todas(request, funcionario_id: int):
    get_object_or_404(Funcionario, id=funcionario_id)
    return {"total": marcar_todas_lidas(funcionario_id)}  # quantas foram marcadas


@router.post("/destinatarios/{int:destinatario_id}/lida", response=CaixaOut)
def marcar_como_lida(request, destinatario_id: int):
    destinatario = get_object_or_404(_qs_caixa(), id=destinatario_id)
    return marcar_lida(destinatario, True)


@router.post("/destinatarios/{int:destinatario_id}/nao-lida", response=CaixaOut)
def marcar_como_nao_lida(request, destinatario_id: int):
    destinatario = get_object_or_404(_qs_caixa(), id=destinatario_id)
    return marcar_lida(destinatario, False)


# =============== Regras de notificações ===============


@router.get("/regras", response=list[RegraOut])
def listar_regras(request):
    return [obter_regra(t) for t in TipoRegra.values]


@router.patch("/regras/{tipo}", response=RegraOut)
def atualizar_regra(request, tipo: TipoRegra, payload: RegraUpdate):
    regra = obter_regra(tipo)
    dados = payload.dict(exclude_unset=True)
    setores = dados.pop("setores_destino_ids", None)
    salvar(definir(regra, dados), "regra")
    if setores is not None:
        regra.setores_destino.set(setores)
    return regra
