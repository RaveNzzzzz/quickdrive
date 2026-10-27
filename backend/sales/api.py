from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Max, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Query, Router
from ninja.errors import HttpError
from ninja.pagination import paginate

from accounts.authentication import JWTAuth, pode_gerenciar
from customers.models import Cliente
from employees.models import Funcionario
from stock.models import Lote
from vehicles.models import Veiculo

from .enums import EtapaNegociacao, ItemCompra, StatusCompra, StatusVenda
from .models import Compra, Negociacao, NegociacaoEvento, Venda
from .schemas import (
    AlertaFunilOut,
    CompraIn,
    CompraOut,
    CompraUpdate,
    NegociacaoEventoOut,
    NegociacaoGanhar,
    NegociacaoIn,
    NegociacaoMover,
    NegociacaoOut,
    NegociacaoUpdate,
    VendaIn,
    VendaOut,
    VendaUpdate,
)
from .services import (
    ETAPAS_ABERTAS,
    mudar_etapa,
    reabrir_negociacao_da_venda,
    registrar_interacao,
    sincronizar_veiculo,
)

vendas_router = Router(tags=["vendas"], auth=JWTAuth())
compras_router = Router(tags=["compras"], auth=JWTAuth())

# Campo de FK recebido no JSON -> (model, mensagem quando o id não existe)
RELACIONADOS = {
    "veiculo_id": (Veiculo, "Veículo não encontrado."),
    "cliente_id": (Cliente, "Cliente não encontrado."),
    "funcionario_id": (Funcionario, "Funcionário não encontrado."),
    "lote_id": (Lote, "Lote não encontrado."),
}
VEICULO_JA_VENDIDO = "Este veículo já tem uma venda ativa."


def _conferir_relacionados(dados: dict):
    for campo, (modelo, mensagem) in RELACIONADOS.items():
        valor = dados.get(campo)
        if valor is not None and not modelo.objects.filter(id=valor).exists():
            raise HttpError(404, mensagem)


def _dados_update(payload, anulaveis: tuple[str, ...] = ()) -> dict:
    # Só os campos enviados no PATCH. "null" só é aceito nos campos opcionais do model.
    dados = payload.dict(exclude_unset=True)
    for campo, valor in dados.items():
        if valor is None and campo not in anulaveis:
            raise HttpError(422, f"O campo {campo} não pode ficar vazio.")
    return dados


def _conferir_funcionario(request, dados: dict, rotulo: str):
    # Gerente registra em nome de qualquer funcionário; os demais, só em nome próprio.
    if "funcionario_id" not in dados or pode_gerenciar(request.user):
        return
    if dados["funcionario_id"] != request.user.funcionario_id:
        raise HttpError(403, f"Você só pode registrar {rotulo} em seu próprio nome.")


def _validar(objeto):
    # Roda as regras do clean() do model e devolve a mensagem como texto (o front mostra o "detail").
    try:
        objeto.clean()
    except ValidationError as erro:
        raise HttpError(422, " ".join(erro.messages))


# --- Vendas ---


def _vendas():
    return Venda.objects.select_related("veiculo__marca", "cliente__pessoa", "funcionario__pessoa")


def _checar_veiculo_livre(veiculo_id: int, ignorar_id: int | None = None):
    ativas = Venda.objects.filter(veiculo_id=veiculo_id).exclude(status=StatusVenda.CANCELADA)
    if ignorar_id is not None:
        ativas = ativas.exclude(id=ignorar_id)
    if ativas.exists():
        raise HttpError(409, VEICULO_JA_VENDIDO)


@vendas_router.get("", response=list[VendaOut])
@paginate
def listar_vendas(request, status: StatusVenda | None = None):
    qs = _vendas().order_by("-data_venda", "-id")
    if status is not None:
        qs = qs.filter(status=status)
    return qs


@vendas_router.post("", response={201: VendaOut})
def criar_venda(request, payload: VendaIn):
    dados = payload.dict()
    _conferir_funcionario(request, dados, "vendas")
    _conferir_relacionados(dados)
    ativa = dados["status"] != StatusVenda.CANCELADA
    if ativa:
        _checar_veiculo_livre(dados["veiculo_id"])
    try:
        with transaction.atomic():
            venda = Venda.objects.create(**dados)
            sincronizar_veiculo(venda.veiculo_id)
    except IntegrityError:
        # Duas pessoas venderam o mesmo carro ao mesmo tempo (constraint venda_ativa_unica_por_veiculo).
        raise HttpError(409, VEICULO_JA_VENDIDO)
    return 201, _vendas().get(pk=venda.pk)


@vendas_router.get("/{int:venda_id}", response=VendaOut)
def obter_venda(request, venda_id: int):
    return get_object_or_404(_vendas(), id=venda_id)


@vendas_router.patch("/{int:venda_id}", response=VendaOut)
def atualizar_venda(request, venda_id: int, payload: VendaUpdate):
    dados = _dados_update(payload)
    _conferir_funcionario(request, dados, "vendas")
    _conferir_relacionados(dados)
    try:
        with transaction.atomic():
            venda = get_object_or_404(Venda.objects.select_for_update(), id=venda_id)
            estava_ativa = venda.status != StatusVenda.CANCELADA
            for campo, valor in dados.items():
                setattr(venda, campo, valor)
            ativa = venda.status != StatusVenda.CANCELADA
            if ativa and not estava_ativa:  # venda cancelada sendo reativada
                _checar_veiculo_livre(venda.veiculo_id, ignorar_id=venda.id)
            venda.save()
            if estava_ativa and not ativa:
                # Venda cancelada: a negociação do funil que a gerou volta a ficar aberta.
                reabrir_negociacao_da_venda(venda.id, request.user.funcionario_id)
            if ativa != estava_ativa:
                sincronizar_veiculo(venda.veiculo_id)
    except IntegrityError:
        raise HttpError(409, VEICULO_JA_VENDIDO)
    return _vendas().get(pk=venda.pk)


@vendas_router.delete("/{int:venda_id}", response={204: None})
def excluir_venda(request, venda_id: int):
    # Se a venda tiver contas a receber, o PROTECT impede a exclusão (409 pelo handler de config/api.py).
    with transaction.atomic():
        venda = get_object_or_404(Venda.objects.select_for_update(), id=venda_id)
        reabrir_negociacao_da_venda(venda.id, request.user.funcionario_id)
        venda.delete()
        sincronizar_veiculo(venda.veiculo_id)
    return 204, None


# --- Compras ---

COMPRA_ANULAVEIS = ("cliente_id", "veiculo_id", "lote_id")


def _compras():
    return Compra.objects.select_related(
        "funcionario__pessoa", "cliente__pessoa", "veiculo__marca", "lote__produto"
    )


@compras_router.get("", response=list[CompraOut])
@paginate
def listar_compras(request, status: StatusCompra | None = None, item_compra: ItemCompra | None = None):
    qs = _compras().order_by("-data_compra", "-id")
    if status is not None:
        qs = qs.filter(status=status)
    if item_compra is not None:
        qs = qs.filter(item_compra=item_compra)
    return qs


@compras_router.post("", response={201: CompraOut})
def criar_compra(request, payload: CompraIn):
    dados = payload.dict()
    _conferir_funcionario(request, dados, "compras")
    _conferir_relacionados(dados)
    compra = Compra(**dados)
    _validar(compra)
    compra.save()
    return 201, _compras().get(pk=compra.pk)


@compras_router.get("/{int:compra_id}", response=CompraOut)
def obter_compra(request, compra_id: int):
    return get_object_or_404(_compras(), id=compra_id)


@compras_router.patch("/{int:compra_id}", response=CompraOut)
def atualizar_compra(request, compra_id: int, payload: CompraUpdate):
    dados = _dados_update(payload, anulaveis=COMPRA_ANULAVEIS)
    _conferir_funcionario(request, dados, "compras")
    _conferir_relacionados(dados)
    with transaction.atomic():
        compra = get_object_or_404(Compra.objects.select_for_update(), id=compra_id)
        for campo, valor in dados.items():
            setattr(compra, campo, valor)
        _validar(compra)
        compra.save()
    return _compras().get(pk=compra.pk)


@compras_router.delete("/{int:compra_id}", response={204: None})
def excluir_compra(request, compra_id: int):
    # Se a compra tiver contas a pagar, o PROTECT impede a exclusão (409 pelo handler de config/api.py).
    compra = get_object_or_404(Compra, id=compra_id)
    compra.delete()
    return 204, None


# --- Funil de vendas (negociações) ---

negociacoes_router = Router(tags=["funil de vendas"], auth=JWTAuth())

NEGOCIACAO_ANULAVEIS = ("cliente_id", "veiculo_id", "valor_proposta", "proximo_contato")
# A partir de quantos dias na mesma etapa a negociação conta como "parada" (o front usa o mesmo número).
DIAS_PARADA = 8


def _negociacoes():
    return Negociacao.objects.select_related("cliente__pessoa", "veiculo__marca", "funcionario__pessoa")


def _conferir_dono(request, negociacao: Negociacao):
    # Quem não é gerente só mexe nas próprias negociações (mas enxerga as de todos).
    if not pode_gerenciar(request.user) and negociacao.funcionario_id != request.user.funcionario_id:
        raise HttpError(403, "Você só pode alterar as suas negociações.")


def _checar_veiculo_negociavel(veiculo_id: int | None):
    if veiculo_id and Venda.objects.filter(veiculo_id=veiculo_id).exclude(status=StatusVenda.CANCELADA).exists():
        raise HttpError(409, "Este veículo já foi vendido.")


def _proxima_ordem(etapa: str) -> int:
    ultima = Negociacao.objects.filter(etapa=etapa).aggregate(maior=Max("ordem"))["maior"]
    return 0 if ultima is None else ultima + 1


def _reordenar(negociacao: Negociacao, antes_de: int | None):
    """Coloca a negociação antes de `antes_de` na coluna dela (ou no fim) e renumera a coluna 0, 1, 2..."""
    coluna = list(
        Negociacao.objects.filter(etapa=negociacao.etapa)
        .exclude(id=negociacao.id)
        .order_by("ordem", "id")
        .values_list("id", "ordem")
    )
    ids = [nid for nid, _ in coluna]
    posicao = ids.index(antes_de) if antes_de in ids else len(ids)
    ids.insert(posicao, negociacao.id)
    ordem_atual = dict(coluna)
    for nova_ordem, nid in enumerate(ids):
        if nid == negociacao.id:
            negociacao.ordem = nova_ordem
        elif ordem_atual[nid] != nova_ordem:  # só grava quem realmente mudou de posição
            Negociacao.objects.filter(id=nid).update(ordem=nova_ordem)


@negociacoes_router.get("", response=list[NegociacaoOut])
@paginate
def listar_negociacoes(
    request, funcionario_id: int | None = None, encerradas_dias: int = Query(90, ge=0, le=3650)
):
    """Todas as negociações abertas + as vendidas/perdidas nos últimos `encerradas_dias` dias."""
    limite = timezone.now() - timedelta(days=encerradas_dias)
    qs = _negociacoes().filter(Q(etapa__in=ETAPAS_ABERTAS) | Q(etapa_desde__gte=limite))
    if funcionario_id is not None:
        qs = qs.filter(funcionario_id=funcionario_id)
    return qs.order_by("ordem", "id")


@negociacoes_router.post("", response={201: NegociacaoOut})
def criar_negociacao(request, payload: NegociacaoIn):
    dados = payload.dict()
    if dados["funcionario_id"] is None:
        if not request.user.funcionario_id:
            raise HttpError(422, "Informe o funcionário responsável pela negociação.")
        dados["funcionario_id"] = request.user.funcionario_id
    _conferir_funcionario(request, dados, "negociações")
    _conferir_relacionados(dados)
    _checar_veiculo_negociavel(dados["veiculo_id"])
    with transaction.atomic():
        negociacao = Negociacao.objects.create(**dados, ordem=_proxima_ordem(dados["etapa"]))
        NegociacaoEvento.objects.create(
            negociacao=negociacao, etapa_nova=negociacao.etapa, funcionario_id=request.user.funcionario_id
        )
        sincronizar_veiculo(negociacao.veiculo_id)
        registrar_interacao(negociacao.cliente_id)
    return 201, _negociacoes().get(pk=negociacao.pk)


@negociacoes_router.get("/{int:negociacao_id}", response=NegociacaoOut)
def obter_negociacao(request, negociacao_id: int):
    return get_object_or_404(_negociacoes(), id=negociacao_id)


@negociacoes_router.patch("/{int:negociacao_id}", response=NegociacaoOut)
def atualizar_negociacao(request, negociacao_id: int, payload: NegociacaoUpdate):
    dados = _dados_update(payload, anulaveis=NEGOCIACAO_ANULAVEIS)
    _conferir_funcionario(request, dados, "negociações")
    _conferir_relacionados(dados)
    with transaction.atomic():
        negociacao = get_object_or_404(Negociacao.objects.select_for_update(), id=negociacao_id)
        _conferir_dono(request, negociacao)
        if negociacao.etapa == EtapaNegociacao.VENDIDO and ("veiculo_id" in dados or "cliente_id" in dados):
            raise HttpError(409, "Negociação já vendida: o cliente e o veículo vêm da venda.")
        if "veiculo_id" in dados and dados["veiculo_id"] != negociacao.veiculo_id:
            _checar_veiculo_negociavel(dados["veiculo_id"])
        veiculo_antigo = negociacao.veiculo_id
        for campo, valor in dados.items():
            setattr(negociacao, campo, valor)
        negociacao.save()
        sincronizar_veiculo(veiculo_antigo)
        if negociacao.veiculo_id != veiculo_antigo:
            sincronizar_veiculo(negociacao.veiculo_id)
        registrar_interacao(negociacao.cliente_id)
    return _negociacoes().get(pk=negociacao.pk)


@negociacoes_router.delete("/{int:negociacao_id}", response={204: None})
def excluir_negociacao(request, negociacao_id: int):
    with transaction.atomic():
        negociacao = get_object_or_404(Negociacao.objects.select_for_update(), id=negociacao_id)
        _conferir_dono(request, negociacao)
        if negociacao.etapa == EtapaNegociacao.VENDIDO:
            raise HttpError(409, "Negociação com venda registrada não pode ser excluída. Cancele a venda antes.")
        veiculo_id = negociacao.veiculo_id
        negociacao.delete()
        sincronizar_veiculo(veiculo_id)
    return 204, None


@negociacoes_router.post("/{int:negociacao_id}/mover", response=NegociacaoOut)
def mover_negociacao(request, negociacao_id: int, payload: NegociacaoMover):
    etapa = payload.etapa
    if etapa == EtapaNegociacao.VENDIDO:
        raise HttpError(409, "Para marcar como vendida, registre a venda (opção Registrar venda).")
    with transaction.atomic():
        negociacao = get_object_or_404(Negociacao.objects.select_for_update(), id=negociacao_id)
        _conferir_dono(request, negociacao)
        if negociacao.etapa == EtapaNegociacao.VENDIDO:
            raise HttpError(409, "Esta negociação já virou venda. Para reabrir, cancele a venda na tela de Vendas.")
        entrando_em_perdido = etapa == EtapaNegociacao.PERDIDO and negociacao.etapa != EtapaNegociacao.PERDIDO
        if entrando_em_perdido and not payload.motivo_perda:
            raise HttpError(422, "Informe o motivo da perda.")
        if negociacao.etapa != etapa:
            mudar_etapa(negociacao, etapa, request.user.funcionario_id)
        if entrando_em_perdido:
            negociacao.motivo_perda = payload.motivo_perda
        _reordenar(negociacao, payload.antes_de)
        negociacao.save()
        sincronizar_veiculo(negociacao.veiculo_id)
        registrar_interacao(negociacao.cliente_id)
    return _negociacoes().get(pk=negociacao.pk)


@negociacoes_router.post("/{int:negociacao_id}/ganhar", response=NegociacaoOut)
def ganhar_negociacao(request, negociacao_id: int, payload: NegociacaoGanhar):
    """Liga a venda já registrada (POST /vendas) à negociação e a coloca em Vendido."""
    with transaction.atomic():
        negociacao = get_object_or_404(Negociacao.objects.select_for_update(), id=negociacao_id)
        _conferir_dono(request, negociacao)
        if negociacao.etapa == EtapaNegociacao.VENDIDO:
            raise HttpError(409, "Esta negociação já está como vendida.")
        venda = Venda.objects.filter(id=payload.venda_id).first()
        if venda is None:
            raise HttpError(404, "Venda não encontrada.")
        if venda.status == StatusVenda.CANCELADA:
            raise HttpError(409, "Não é possível ligar uma venda cancelada.")
        if Negociacao.objects.filter(venda=venda).exclude(id=negociacao.id).exists():
            raise HttpError(409, "Esta venda já está ligada a outra negociação.")
        veiculo_antigo = negociacao.veiculo_id
        # A venda é a fonte da verdade: cliente, veículo e valor passam a ser os dela.
        negociacao.venda = venda
        negociacao.cliente_id = venda.cliente_id
        negociacao.veiculo_id = venda.veiculo_id
        negociacao.valor_proposta = venda.valor_venda
        mudar_etapa(negociacao, EtapaNegociacao.VENDIDO, request.user.funcionario_id)
        negociacao.ordem = _proxima_ordem(EtapaNegociacao.VENDIDO)
        negociacao.save()
        if veiculo_antigo != venda.veiculo_id:
            sincronizar_veiculo(veiculo_antigo)
        sincronizar_veiculo(venda.veiculo_id)
        registrar_interacao(venda.cliente_id)
    return _negociacoes().get(pk=negociacao.pk)


@negociacoes_router.get("/{int:negociacao_id}/historico", response=list[NegociacaoEventoOut])
def historico_negociacao(request, negociacao_id: int):
    get_object_or_404(Negociacao, id=negociacao_id)
    return NegociacaoEvento.objects.filter(negociacao_id=negociacao_id).select_related("funcionario__pessoa")


def _nome_negociacao(negociacao: Negociacao) -> str:
    return negociacao.cliente.pessoa.nome if negociacao.cliente else negociacao.nome_interessado


def _resumo_nomes(nomes: list[str]) -> str:
    # Mostra até 2 nomes; se houver mais, completa com "e mais N".
    texto = ", ".join(nomes[:2])
    return texto if len(nomes) <= 2 else f"{texto} e mais {len(nomes) - 2}"


def _plural(n: int, singular: str, plural: str) -> str:
    return singular if n == 1 else plural


@negociacoes_router.get("/alertas", response=list[AlertaFunilOut])
def alertas_funil(request):
    """Contatos atrasados ou para hoje e negociações paradas. Quem não é gerente vê só as suas."""
    hoje = timezone.localdate()
    abertas = Negociacao.objects.filter(etapa__in=ETAPAS_ABERTAS).select_related("cliente__pessoa")
    if not pode_gerenciar(request.user):
        abertas = abertas.filter(funcionario_id=request.user.funcionario_id)

    alertas = []
    atrasados = [_nome_negociacao(n) for n in abertas.filter(proximo_contato__lt=hoje).order_by("proximo_contato")]
    if atrasados:
        n = len(atrasados)
        alertas.append(AlertaFunilOut(
            tipo="contato",
            nivel="danger",
            titulo=f"{n} {_plural(n, 'contato atrasado', 'contatos atrasados')} no funil",
            subtitulo=_resumo_nomes(atrasados),
        ))
    para_hoje = [_nome_negociacao(n) for n in abertas.filter(proximo_contato=hoje)]
    if para_hoje:
        n = len(para_hoje)
        alertas.append(AlertaFunilOut(
            tipo="contato",
            nivel="warning",
            titulo=f"{n} {_plural(n, 'contato', 'contatos')} para hoje",
            subtitulo=_resumo_nomes(para_hoje),
        ))
    limite = timezone.now() - timedelta(days=DIAS_PARADA)
    paradas = [_nome_negociacao(n) for n in abertas.filter(etapa_desde__lte=limite).order_by("etapa_desde")]
    if paradas:
        n = len(paradas)
        alertas.append(AlertaFunilOut(
            tipo="funil_parado",
            nivel="warning",
            titulo=f"{n} {_plural(n, 'negociação parada', 'negociações paradas')} há {DIAS_PARADA}+ dias",
            subtitulo=_resumo_nomes(paradas),
        ))
    return alertas
