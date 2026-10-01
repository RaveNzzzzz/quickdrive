from django.core.exceptions import ValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from ninja import Query, Router
from ninja.pagination import paginate
from ninja_jwt.authentication import JWTAuth

from people.services import atualizar_pessoa, criar_pessoa, definir, salvar

from .models import Cargo, Desligamento, Funcionario, Setor
from .schemas import (
    CargoIn,
    CargoOut,
    CargoUpdate,
    DesligamentoIn,
    FuncionarioFiltro,
    FuncionarioIn,
    FuncionarioOut,
    FuncionarioUpdate,
    SetorIn,
    SetorOut,
    SetorUpdate,
)


def aplicar(obj, payload):
    return definir(obj, payload.dict(exclude_unset=True))


# =============== Setores ===============

setores_router = Router(tags=["setores"], auth=JWTAuth())


@setores_router.get("", response=list[SetorOut])
@paginate
def listar_setores(request):
    return Setor.objects.all()


@setores_router.post("", response={201: SetorOut})
def criar_setor(request, payload: SetorIn):
    return 201, salvar(Setor(**payload.dict()))


@setores_router.get("/{int:setor_id}", response=SetorOut)
def obter_setor(request, setor_id: int):
    return get_object_or_404(Setor, id=setor_id)


@setores_router.patch("/{int:setor_id}", response=SetorOut)
def atualizar_setor(request, setor_id: int, payload: SetorUpdate):
    setor = get_object_or_404(Setor, id=setor_id)
    return salvar(aplicar(setor, payload))


@setores_router.delete("/{int:setor_id}", response={204: None})
def remover_setor(request, setor_id: int):
    get_object_or_404(Setor, id=setor_id).delete()  # RESTRICT -> 409 (handler)
    return 204, None


# =============== Cargos ===============

cargos_router = Router(tags=["cargos"], auth=JWTAuth())


@cargos_router.get("", response=list[CargoOut])
@paginate
def listar_cargos(request, setor_id: int | None = None):
    qs = Cargo.objects.select_related("setor")
    if setor_id is not None:
        qs = qs.filter(setor_id=setor_id)
    return qs


@cargos_router.post("", response={201: CargoOut})
def criar_cargo(request, payload: CargoIn):
    cargo = salvar(Cargo(**payload.dict()))
    return 201, cargo


@cargos_router.get("/{int:cargo_id}", response=CargoOut)
def obter_cargo(request, cargo_id: int):
    return get_object_or_404(Cargo.objects.select_related("setor"), id=cargo_id)


@cargos_router.patch("/{int:cargo_id}", response=CargoOut)
def atualizar_cargo(request, cargo_id: int, payload: CargoUpdate):
    cargo = get_object_or_404(Cargo, id=cargo_id)
    return salvar(aplicar(cargo, payload))


@cargos_router.delete("/{int:cargo_id}", response={204: None})
def remover_cargo(request, cargo_id: int):
    get_object_or_404(Cargo, id=cargo_id).delete()
    return 204, None


# =============== Funcionários ===============

funcionarios_router = Router(tags=["funcionarios"], auth=JWTAuth())


def _queryset():
    return Funcionario.objects.select_related("pessoa__endereco", "cargo__setor", "desligamento")


@funcionarios_router.get("", response=list[FuncionarioOut])
@paginate
def listar_funcionarios(request, filtros: FuncionarioFiltro = Query(...)):
    return filtros.filter(_queryset())


@funcionarios_router.post("", response={201: FuncionarioOut})
def criar_funcionario(request, payload: FuncionarioIn):
    with transaction.atomic():
        pessoa = criar_pessoa(payload.pessoa.dict())
        dados = payload.dict(exclude={"pessoa"})
        funcionario = salvar(Funcionario(pessoa=pessoa, **dados), "funcionario")
    return 201, _queryset().get(pk=funcionario.pk)


@funcionarios_router.get("/{int:funcionario_id}", response=FuncionarioOut)
def obter_funcionario(request, funcionario_id: int):
    return get_object_or_404(_queryset(), id=funcionario_id)


@funcionarios_router.patch("/{int:funcionario_id}", response=FuncionarioOut)
def atualizar_funcionario(request, funcionario_id: int, payload: FuncionarioUpdate):
    with transaction.atomic():
        funcionario = get_object_or_404(_queryset(), id=funcionario_id)
        if not funcionario.ativo:
            raise ValidationError({"funcionario": "Funcionário desligado não pode ser editado."})

        dados = payload.dict(exclude_unset=True)
        pessoa_dados = dados.pop("pessoa", None)

        if pessoa_dados:
            atualizar_pessoa(funcionario.pessoa, pessoa_dados)
        if dados:
            salvar(definir(funcionario, dados), "funcionario")
    return _queryset().get(pk=funcionario.pk)


@funcionarios_router.post("/{int:funcionario_id}/desligar", response=FuncionarioOut)
def desligar(request, funcionario_id: int, payload: DesligamentoIn):
    with transaction.atomic():
        funcionario = get_object_or_404(_queryset().select_for_update(of=("self",)), id=funcionario_id)
        if not funcionario.ativo:
            raise ValidationError({"funcionario": "Funcionário já está desligado."})
        return salvar(Desligamento(funcionario=funcionario, **payload.dict()), "desligamento")
    return _queryset().get(pk=funcionario_id)
