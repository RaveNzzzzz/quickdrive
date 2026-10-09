from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Query, Router
from ninja.pagination import paginate
from accounts.authentication import JWTAuth

from people.services import atualizar_pessoa, criar_pessoa, salvar

from .models import Cliente
from .schemas import ClienteFiltro, ClienteIn, ClienteOut, ClienteUpdate

router = Router(tags=["clientes"], auth=JWTAuth())


def _queryset():
    return Cliente.objects.select_related("pessoa__endereco")


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
