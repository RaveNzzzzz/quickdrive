from django.db import transaction
from django.utils import timezone

from people.services import definir, salvar

from .enums import SituacaoDocumento
from .models import DocumentoCliente, DocumentoFuncionario


@transaction.atomic
def salvar_documento(documento, dados: dict, arquivo=None):
    """Cria ou atualiza um documento. Se vier arquivo novo, apaga o antigo do disco."""
    arquivo_antigo = documento.arquivo.name if documento.arquivo else None
    storage = documento.arquivo.storage

    definir(documento, dados)
    if arquivo is not None:
        documento.arquivo = arquivo
    salvar(documento, "documento")

    if arquivo is not None and arquivo_antigo:
        transaction.on_commit(lambda: storage.delete(arquivo_antigo))
    return documento


@transaction.atomic
def remover_documento(documento):
    nome = documento.arquivo.name if documento.arquivo else None
    storage = documento.arquivo.storage
    documento.delete()
    if nome:
        transaction.on_commit(lambda: storage.delete(nome))


def atualizar_situacoes() -> int:
    """Marca como VENCIDO os documentos com arquivo cujo vencimento passou."""
    hoje = timezone.localdate()
    total = 0
    for model in (DocumentoCliente, DocumentoFuncionario):
        total += (
            model.objects.filter(vencimento__lt=hoje)
            .exclude(arquivo="")
            .exclude(situacao=SituacaoDocumento.VENCIDO)
            .update(situacao=SituacaoDocumento.VENCIDO)
        )
    return total
