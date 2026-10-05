from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.pagination import paginate
from ninja_jwt.authentication import JWTAuth

from .models import Cambio, Carroceria, Combustivel, Marca, Veiculo
from .schemas import (
    CambioIn,
    CambioOut,
    CarroceriaIn,
    CarroceriaOut,
    CombustivelIn,
    CombustivelOut,
    MarcaIn,
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

# --- Marca ---

@router.get("/opcoes/marcas", response=list[MarcaOut])
def list_marcas(request):
    return Marca.objects.all()


@router.post("/opcoes/marcas", response={201: MarcaOut})
def create_marca(request, payload: MarcaIn):
    marca = Marca.objects.create(**payload.dict())
    return 201, marca


@router.patch("/opcoes/marcas/{int:marca_id}", response=MarcaOut)
def update_marca(request, marca_id: int, payload: MarcaIn):
    marca = get_object_or_404(Marca, id=marca_id)
    marca.nome = payload.nome
    marca.save()
    return marca


@router.delete("/opcoes/marcas/{int:marca_id}", response={204: None})
def delete_marca(request, marca_id: int):
    marca = get_object_or_404(Marca, id=marca_id)
    marca.delete()
    return 204, None


# --- Câmbio ---

@router.get("/opcoes/cambios", response=list[CambioOut])
def list_cambios(request):
    return Cambio.objects.all()


@router.post("/opcoes/cambios", response={201: CambioOut})
def create_cambio(request, payload: CambioIn):
    cambio = Cambio.objects.create(**payload.dict())
    return 201, cambio


@router.patch("/opcoes/cambios/{int:cambio_id}", response=CambioOut)
def update_cambio(request, cambio_id: int, payload: CambioIn):
    cambio = get_object_or_404(Cambio, id=cambio_id)
    cambio.nome = payload.nome
    cambio.save()
    return cambio


@router.delete("/opcoes/cambios/{int:cambio_id}", response={204: None})
def delete_cambio(request, cambio_id: int):
    cambio = get_object_or_404(Cambio, id=cambio_id)
    cambio.delete()
    return 204, None


# --- Combustível ---

@router.get("/opcoes/combustiveis", response=list[CombustivelOut])
def list_combustiveis(request):
    return Combustivel.objects.all()


@router.post("/opcoes/combustiveis", response={201: CombustivelOut})
def create_combustivel(request, payload: CombustivelIn):
    combustivel = Combustivel.objects.create(**payload.dict())
    return 201, combustivel


@router.patch("/opcoes/combustiveis/{int:combustivel_id}", response=CombustivelOut)
def update_combustivel(request, combustivel_id: int, payload: CombustivelIn):
    combustivel = get_object_or_404(Combustivel, id=combustivel_id)
    combustivel.nome = payload.nome
    combustivel.save()
    return combustivel


@router.delete("/opcoes/combustiveis/{int:combustivel_id}", response={204: None})
def delete_combustivel(request, combustivel_id: int):
    combustivel = get_object_or_404(Combustivel, id=combustivel_id)
    combustivel.delete()
    return 204, None


# --- Carroceria ---

@router.get("/opcoes/carrocerias", response=list[CarroceriaOut])
def list_carrocerias(request):
    return Carroceria.objects.all()


@router.post("/opcoes/carrocerias", response={201: CarroceriaOut})
def create_carroceria(request, payload: CarroceriaIn):
    carroceria = Carroceria.objects.create(**payload.dict())
    return 201, carroceria


@router.patch("/opcoes/carrocerias/{int:carroceria_id}", response=CarroceriaOut)
def update_carroceria(request, carroceria_id: int, payload: CarroceriaIn):
    carroceria = get_object_or_404(Carroceria, id=carroceria_id)
    carroceria.nome = payload.nome
    carroceria.save()
    return carroceria


@router.delete("/opcoes/carrocerias/{int:carroceria_id}", response={204: None})
def delete_carroceria(request, carroceria_id: int):
    carroceria = get_object_or_404(Carroceria, id=carroceria_id)
    carroceria.delete()
    return 204, None