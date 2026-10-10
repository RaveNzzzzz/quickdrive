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
    vaga: str = ""

class VeiculoUpdate(Schema):
    ano_modelo: int | None = None
    ano_fabricacao: date | None = None
    portas: int | None = None
    quilometragem: int | None = None
    lugares: int | None = None
    chassi: str | None = None
    versao: str | None = None
    cor: str | None = None
    porta_malas: int | None = None
    motorizacao: str | None = None
    status: str | None = None
    renavam: str | None = None
    valor: float | None = None
    modelo: str | None = None
    placa: str | None = None
    vaga: str | None = None
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
    vaga: str
    marca: str
    cambio: str
    combustivel: str
    carroceria: str
    marca_id: int
    cambio_id: int
    combustivel_id: int
    carroceria_id: int
    # Caminho relativo à raiz da API (o front junta com VITE_API_URL). None = sem foto.
    imagem_url: str | None = None

    @staticmethod
    def resolve_imagem_url(obj):
        # "imagem_principal" é preenchido pelo Prefetch da listagem (sem carregar os bytes).
        # Nas demais rotas (get/create/update) ele não existe, então buscamos aqui.
        if hasattr(obj, "imagem_principal"):
            principal = obj.imagem_principal[0] if obj.imagem_principal else None
        else:
            principal = obj.imagens.filter(principal=True).defer("arquivo").first()
        if principal is None:
            return None
        versao = int(principal.atualizado_em.timestamp() * 1000)  # muda ao trocar a foto -> navegador recarrega
        return f"/veiculos/{obj.id}/imagem?v={versao}"

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