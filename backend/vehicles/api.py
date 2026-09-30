from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.pagination import paginate
from ninja_jwt.authentication import JWTAuth

from .models import Cambio, Carroceria, Combustivel, Marca, Veiculo
from .schemas import (
    CambioOut,
    CarroceriaOut,
    CombustivelOut,
    MarcaOut,
    VeiculoIn,
    VeiculoOut,
    VeiculoUpdate,
)

router = Router(tags=["vehicles"], auth=JWTAuth())


@router.get("", response=list[VeiculoOut])
@paginate
def list_veiculos(request, status: str | None = None):
    qs = Veiculo.objects.select_related("marca", "cambio", "combustivel", "carroceria")
    if status is not None:
        qs = qs.filter(status=status)
    return qs


@router.post("", response={201: VeiculoOut})
def create_veiculo(request, payload: VeiculoIn):
    veiculo = Veiculo.objects.create(**payload.dict())
    return 201, veiculo


@router.get("/{int:veiculo_id}", response=VeiculoOut)
def get_veiculo(request, veiculo_id: int):
    return get_object_or_404(Veiculo, id=veiculo_id)


@router.patch("/{int:veiculo_id}", response=VeiculoOut)
def update_veiculo(request, veiculo_id: int, payload: VeiculoUpdate):
    veiculo = get_object_or_404(Veiculo, id=veiculo_id)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(veiculo, field, value)
    veiculo.save()
    return veiculo


@router.delete("/{int:veiculo_id}", response={204: None})
def delete_veiculo(request, veiculo_id: int):
    veiculo = get_object_or_404(Veiculo, id=veiculo_id)
    veiculo.delete()
    return 204, None


# Endpoints auxiliares, para popular selects no frontend (marca, câmbio, etc.)

@router.get("/opcoes/marcas", response=list[MarcaOut])
def list_marcas(request):
    return Marca.objects.all()


@router.get("/opcoes/cambios", response=list[CambioOut])
def list_cambios(request):
    return Cambio.objects.all()


@router.get("/opcoes/combustiveis", response=list[CombustivelOut])
def list_combustiveis(request):
    return Combustivel.objects.all()


@router.get("/opcoes/carrocerias", response=list[CarroceriaOut])
def list_carrocerias(request):
    return Carroceria.objects.all()