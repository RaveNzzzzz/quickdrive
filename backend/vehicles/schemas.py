from datetime import date

from ninja import Schema


class MarcaOut(Schema):
    id: int
    nome: str


class CambioOut(Schema):
    id: int
    nome: str


class CombustivelOut(Schema):
    id: int
    nome: str


class CarroceriaOut(Schema):
    id: int
    nome: str

# vehicles/schemas.py — adicionar junto dos outros

class MarcaIn(Schema):
    nome: str


class CambioIn(Schema):
    nome: str


class CombustivelIn(Schema):
    nome: str


class CarroceriaIn(Schema):
    nome: str


class VeiculoIn(Schema):
    ano_modelo: int
    ano_fabricacao: date
    portas: int
    quilometragem: int
    lugares: int
    chassi: str
    versao: str
    cor: str
    porta_malas: int
    motorizacao: str
    status: str = "disponivel"
    renavam: str
    valor: float
    modelo: str
    placa: str
    marca_id: int
    cambio_id: int
    combustivel_id: int
    carroceria_id: int


class VeiculoUpdate(Schema):
    ano_modelo: int | None = None
    quilometragem: int | None = None
    cor: str | None = None
    status: str | None = None
    valor: float | None = None
    marca_id: int | None = None
    cambio_id: int | None = None
    combustivel_id: int | None = None
    carroceria_id: int | None = None


class VeiculoOut(Schema):
    id: int
    ano_modelo: int
    ano_fabricacao: date
    portas: int
    data_entrada: date
    quilometragem: int
    lugares: int
    chassi: str
    versao: str
    cor: str
    porta_malas: int
    motorizacao: str
    status: str
    renavam: str
    valor: float
    modelo: str
    placa: str
    marca: str
    cambio: str
    combustivel: str
    carroceria: str

    @staticmethod
    def resolve_marca(obj):
        return obj.marca.nome

    @staticmethod
    def resolve_cambio(obj):
        return obj.cambio.nome

    @staticmethod
    def resolve_combustivel(obj):
        return obj.combustivel.nome

    @staticmethod
    def resolve_carroceria(obj):
        return obj.carroceria.nome