from dataclasses import dataclass
from datetime import timedelta

from django.utils import timezone

from documents.models import DocumentoCliente, DocumentoFuncionario, DocumentoVeiculo

from .enums import TipoRegra


@dataclass
class Alerta:
    chave: str
    titulo: str
    mensagem: str


def _documentos(model, regra, dono: str, prefixo: str, rotulo: str):
    hoje = timezone.localdate()
    limite = hoje + timedelta(days=regra.dias)
    qs = (
        model.objects.exclude(arquivo="")
        .filter(vencimento__lte=limite, **{f"{dono}__ativo": True})
        .select_related("tipo", f"{dono}__pessoa")
    )
    for doc in qs.iterator():
        nome = getattr(doc, dono).pessoa.nome
        vencido = doc.vencimento < hoje
        estado = "vencido" if vencido else "a_vencer"
        data = f"{doc.vencimento:%d/%m/%Y}"
        yield Alerta(
            chave=f"{prefixo}:{doc.pk}:{estado}:{doc.vencimento.isoformat()}",
            titulo=f"{doc.tipo} {'vencido' if vencido else 'a vencer'} ({rotulo})",
            mensagem=f"{doc.tipo} de {nome} {'venceu' if vencido else 'vence'} em {data}.",
        )


def documentos_cliente(regra):
    return _documentos(DocumentoCliente, regra, "cliente", "doc_cliente", "cliente")


def documentos_funcionario(regra):
    return _documentos(
        DocumentoFuncionario, regra, "funcionario", "doc_funcionario", "funcionário"
    )


def documentos_veiculo(regra):
    return _documentos(DocumentoVeiculo, regra, "veiculo", "doc_veiculo", "veículo")


DETECTORES = {
    TipoRegra.DOCUMENTO_CLIENTE: documentos_cliente,
    TipoRegra.DOCUMENTO_FUNCIONARIO: documentos_funcionario,
    TipoRegra.DOCUMENTO_VEICULO: documentos_veiculo,
    # Os demais entram quando os models existirem (veja a tabela mais abaixo).
}
