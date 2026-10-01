from django.core.exceptions import ValidationError
from django.db import transaction

from .models import Endereco, Pessoa


def salvar(obj, prefixo: str = ""):
    """full_clean + save. Prefixa as chaves de erro (ex.: 'pessoa.email')."""
    try:
        obj.full_clean()
    except ValidationError as e:
        if prefixo and hasattr(e, "error_dict"):
            raise ValidationError({f"{prefixo}.{campo}": msgs for campo, msgs in e.message_dict.items()})
        raise
    obj.save()
    return obj


def definir(obj, dados: dict):
    for campo, valor in dados.items():
        setattr(obj, campo, valor)
    return obj


@transaction.atomic
def criar_pessoa(dados: dict) -> Pessoa:
    """Cria Pessoa + Endereço juntos. 'dados' deve conter a chave 'endereco'."""
    dados = dict(dados)
    endereco = dados.pop("endereco")
    pessoa = salvar(Pessoa(**dados), "pessoa")
    salvar(Endereco(pessoa=pessoa, **endereco), "endereco")
    return pessoa


@transaction.atomic
def atualizar_pessoa(pessoa: Pessoa, dados: dict) -> Pessoa:
    """Atualização parcial de Pessoa e/ou Endereço."""
    dados = dict(dados)
    endereco = dados.pop("endereco", None)
    if dados:
        salvar(definir(pessoa, dados), "pessoa")
    if endereco:
        salvar(definir(pessoa.endereco, endereco), "endereco")
    return pessoa
