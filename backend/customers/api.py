from django.db import transaction
from django.db.models import Count, DecimalField, Exists, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Query, Router
from ninja.pagination import paginate
from accounts.authentication import JWTAuth

from people.services import atualizar_pessoa, criar_pessoa, salvar
from sales.enums import StatusVenda
from sales.models import Negociacao, Venda
from sales.services import ETAPAS_ABERTAS

from .models import Cliente
from .schemas import ClienteFiltro, ClienteIn, ClienteOut, ClienteUpdate

router = Router(tags=["clientes"], auth=JWTAuth())


def _queryset():
    # Tudo calculado no próprio banco, numa consulta só (sem N+1).
    venda_valida = ~Q(vendas__status=StatusVenda.CANCELADA)
    abertas = Negociacao.objects.filter(cliente=OuterRef("pk"), etapa__in=ETAPAS_ABERTAS)
    ultima_venda = (
        Venda.objects.filter(cliente=OuterRef("pk")).exclude(status=StatusVenda.CANCELADA).order_by("-data_venda", "-id")
    )
    return Cliente.objects.select_related("pessoa__endereco").annotate(
        veiculos_comprados=Count("vendas", filter=venda_valida),
        ltv=Coalesce(
            Sum("vendas__valor_venda", filter=venda_valida),
            Value(0),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        ),
        em_negociacao=Exists(abertas),
        # Responsável: quem cuida da negociação aberta mais recente; sem ela, quem fez a última venda.
        responsavel=Coalesce(
            Subquery(abertas.order_by("-etapa_desde").values("funcionario__pessoa__nome")[:1]),
            Subquery(ultima_venda.values("funcionario__pessoa__nome")[:1]),
        ),
    )


@router.get("", response=list[ClienteOut])
@paginate
def listar_clientes(request, filtros: ClienteFiltro = Query(...)):
    return filtros.filter(_queryset())


@router.post("", response={201: ClienteOut})
def criar_cliente(request, payload: ClienteIn):
    with transaction.atomic():
        pessoa = criar_pessoa(payload.pessoa.dict())
        cliente = salvar(Cliente(pessoa=pessoa), "cliente")
    return 201, _queryset().get(pk=cliente.pk)


@router.get("/{int:cliente_id}", response=ClienteOut)
def obter_cliente(request, cliente_id: int):
    return get_object_or_404(_queryset(), id=cliente_id)


@router.patch("/{int:cliente_id}", response=ClienteOut)
def atualizar_cliente(request, cliente_id: int, payload: ClienteUpdate):
    with transaction.atomic():
        cliente = get_object_or_404(_queryset(), id=cliente_id)
        pessoa_dados = payload.dict(exclude_unset=True).get("pessoa")
        if pessoa_dados:
            atualizar_pessoa(cliente.pessoa, pessoa_dados)
    return _queryset().get(pk=cliente.pk)


@router.post("/{int:cliente_id}/inativar", response=ClienteOut)
def inativar_cliente(request, cliente_id: int):
    cliente = get_object_or_404(_queryset(), id=cliente_id)
    if cliente.ativo:
        cliente.ativo = False
        cliente.save(update_fields=["ativo", "updated_at"])
    return cliente


@router.post("/{int:cliente_id}/reativar", response=ClienteOut)
def reativar_cliente(request, cliente_id: int):
    cliente = get_object_or_404(_queryset(), id=cliente_id)
    if not cliente.ativo:
        cliente.ativo = True
        cliente.save(update_fields=["ativo", "updated_at"])
    return cliente


@router.post("/{int:cliente_id}/interacao", response=ClienteOut)
def registrar_interacao(request, cliente_id: int):
    cliente = get_object_or_404(_queryset(), id=cliente_id)
    cliente.ultima_interacao = timezone.now()
    cliente.save(update_fields=["ultima_interacao", "updated_at"])
    return cliente
