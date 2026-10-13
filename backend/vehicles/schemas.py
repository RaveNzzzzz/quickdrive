import re
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from ninja import Schema
from pydantic import field_validator

from .enums import StatusVeiculo

# Limites dos campos do veículo. O formulário do front usa os mesmos valores
# (frontend/src/pages/Patio/veiculoLimites.ts) — se mudar aqui, mude lá também.
ANO_MINIMO = 1900
QUILOMETRAGEM_MAX = 999_999  # hodômetros de carro têm 6 dígitos
VALOR_MIN = Decimal("0.01")
VALOR_MAX = Decimal("99999999.99")  # limite do DecimalField(max_digits=10, decimal_places=2)
PORTAS_MIN, PORTAS_MAX = 2, 6
LUGARES_MIN, LUGARES_MAX = 1, 9  # acima de 9 lugares já é micro-ônibus
PORTA_MALAS_MAX = 9_999  # litros

# Chassi (VIN, ISO 3779): 17 caracteres, sem as letras I, O e Q.
CHASSI_RE = re.compile(r"^[A-HJ-NPR-Z0-9]{17}$")
# Placa antiga (ABC1234) ou Mercosul (ABC1D23). O hífen é removido antes de validar.
PLACA_RE = re.compile(r"^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$")
RENAVAM_RE = re.compile(r"^[0-9]{11}$")

# campo: (rótulo, máximo de caracteres, obrigatório)
TEXTOS = {
    "modelo": ("Modelo", 60, True),
    "versao": ("Versão", 60, True),
    "cor": ("Cor", 30, True),
    "motorizacao": ("Motorização", 30, True),
    "vaga": ("Vaga", 10, False),
}


def renavam_valido(renavam: str) -> bool:
    """Confere o dígito verificador (último dígito) do RENAVAM de 11 dígitos."""
    if not RENAVAM_RE.match(renavam):
        return False
    pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma = sum(int(d) * p for d, p in zip(renavam[:10], pesos))
    digito = (soma * 10) % 11
    return (0 if digito == 10 else digito) == int(renavam[10])


def _faixa(valor, minimo, maximo, rotulo: str, unidade: str = ""):
    if valor is not None and not (minimo <= valor <= maximo):
        raise ValueError(f"{rotulo} deve estar entre {minimo} e {maximo}{unidade}.")
    return valor


class _VeiculoValidacoes(Schema):
    """Regras comuns de VeiculoIn e VeiculoUpdate. Em VeiculoUpdate o campo pode vir None (não enviado)."""

    @field_validator(*TEXTOS, check_fields=False)
    @classmethod
    def _texto(cls, valor, info):
        if valor is None:
            return valor
        rotulo, maximo, obrigatorio = TEXTOS[info.field_name]
        valor = " ".join(valor.split())  # tira espaços nas pontas e repetidos
        if obrigatorio and not valor:
            raise ValueError(f"O campo {rotulo} é obrigatório.")
        if len(valor) > maximo:
            raise ValueError(f"O campo {rotulo} aceita no máximo {maximo} caracteres.")
        return valor

    @field_validator("placa", check_fields=False)
    @classmethod
    def _placa(cls, valor):
        if valor is None:
            return valor
        valor = valor.replace("-", "").replace(" ", "").upper()
        if not PLACA_RE.match(valor):
            raise ValueError("Placa inválida. Use o formato ABC1234 ou Mercosul ABC1D23.")
        return valor

    @field_validator("chassi", check_fields=False)
    @classmethod
    def _chassi(cls, valor):
        if valor is None:
            return valor
        valor = valor.replace(" ", "").upper()
        if not CHASSI_RE.match(valor):
            raise ValueError("Chassi inválido. Deve ter 17 letras/números, sem as letras I, O e Q.")
        return valor

    @field_validator("renavam", check_fields=False)
    @classmethod
    def _renavam(cls, valor):
        if valor is None:
            return valor
        valor = valor.strip()
        if not RENAVAM_RE.match(valor):
            raise ValueError("RENAVAM inválido. Deve ter 11 números.")
        if not renavam_valido(valor):
            raise ValueError("RENAVAM inválido. O dígito verificador não confere.")
        return valor

    @field_validator("ano_modelo", check_fields=False)
    @classmethod
    def _ano_modelo(cls, valor):
        return _faixa(valor, ANO_MINIMO, date.today().year + 1, "O ano do modelo")

    @field_validator("ano_fabricacao", check_fields=False)
    @classmethod
    def _ano_fabricacao(cls, valor):
        if valor is not None and not (date(ANO_MINIMO, 1, 1) <= valor <= date.today()):
            raise ValueError(f"A data de fabricação deve estar entre {ANO_MINIMO} e hoje.")
        return valor

    @field_validator("quilometragem", check_fields=False)
    @classmethod
    def _quilometragem(cls, valor):
        return _faixa(valor, 0, QUILOMETRAGEM_MAX, "A quilometragem", " km")

    @field_validator("portas", check_fields=False)
    @classmethod
    def _portas(cls, valor):
        return _faixa(valor, PORTAS_MIN, PORTAS_MAX, "O número de portas")

    @field_validator("lugares", check_fields=False)
    @classmethod
    def _lugares(cls, valor):
        return _faixa(valor, LUGARES_MIN, LUGARES_MAX, "O número de lugares")

    @field_validator("porta_malas", check_fields=False)
    @classmethod
    def _porta_malas(cls, valor):
        return _faixa(valor, 0, PORTA_MALAS_MAX, "O porta-malas", " litros")

    @field_validator("valor", check_fields=False)
    @classmethod
    def _valor(cls, valor):
        if valor is None:
            return valor
        # Confere a faixa antes de arredondar: quantize() estoura com números gigantes.
        if not (VALOR_MIN <= valor <= VALOR_MAX):
            raise ValueError("O preço deve estar entre R$ 0,01 e R$ 99.999.999,99.")
        return valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @field_validator("status", check_fields=False)
    @classmethod
    def _status(cls, valor):
        if valor is not None and valor not in StatusVeiculo.values:
            raise ValueError("Status inválido.")
        return valor


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

OPCAO_NOME_MAX = 60  # mesmo max_length do model


class _OpcaoIn(Schema):
    nome: str

    @field_validator("nome")
    @classmethod
    def _nome(cls, valor):
        valor = " ".join(valor.split())
        if not valor:
            raise ValueError("Informe o nome.")
        if len(valor) > OPCAO_NOME_MAX:
            raise ValueError(f"O nome aceita no máximo {OPCAO_NOME_MAX} caracteres.")
        return valor


class MarcaIn(_OpcaoIn):
    pass


class CambioIn(_OpcaoIn):
    pass


class CombustivelIn(_OpcaoIn):
    pass


class CarroceriaIn(_OpcaoIn):
    pass


class VeiculoIn(_VeiculoValidacoes):
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
    valor: Decimal
    modelo: str
    placa: str
    marca_id: int
    cambio_id: int
    combustivel_id: int
    carroceria_id: int
    vaga: str = ""

class VeiculoUpdate(_VeiculoValidacoes):
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
    valor: Decimal | None = None
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

class AlertaOut(Schema):
    tipo: Literal["parados", "manutencao", "revisao"]
    nivel: Literal["danger", "warning"]
    titulo: str
    subtitulo: str
    # Preenchido quando o alerta é de um veículo só (o front abre a ficha dele).
    veiculo_id: int | None = None
