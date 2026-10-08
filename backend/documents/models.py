import uuid
from pathlib import Path

from django.db import models
from django.utils import timezone

from core.models import TimeStampedModel
from customers.models import Cliente
from employees.models import Funcionario
from vehicles.models import Veiculo

from .enums import SituacaoDocumento
from .validators import extensao_permitida, tamanho_maximo


def caminho_arquivo(instance, filename):
    extensao = Path(filename).suffix.lower()
    return f"documentos/{instance._meta.model_name}/{uuid.uuid4()}{extensao}"


class TipoDocumento(TimeStampedModel):
    nome = models.CharField("nome", max_length=100, unique=True)

    class Meta:
        verbose_name = "tipo de documento"
        verbose_name_plural = "tipos de documento"
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class DocumentoBase(TimeStampedModel):
    tipo = models.ForeignKey(
        TipoDocumento, on_delete=models.PROTECT, related_name="%(class)ss"
    )
    arquivo = models.FileField(
        "arquivo",
        upload_to=caminho_arquivo,
        max_length=255,
        blank=True,
        validators=[extensao_permitida, tamanho_maximo],
    )
    vencimento = models.DateField("vencimento", null=True, blank=True)
    situacao = models.CharField(
        "situação",
        max_length=10,
        choices=SituacaoDocumento.choices,
        default=SituacaoDocumento.PENDENTE,
        editable=False,
        db_index=True,
    )

    class Meta:
        abstract = True
        ordering = ["-updated_at"]

    def calcular_situacao(self):
        if not self.arquivo:
            return SituacaoDocumento.PENDENTE
        if self.vencimento and self.vencimento < timezone.localdate():
            return SituacaoDocumento.VENCIDO
        return SituacaoDocumento.REGULAR

    def save(self, *args, **kwargs):
        self.situacao = self.calcular_situacao()
        super().save(*args, **kwargs)


class DocumentoCliente(DocumentoBase):
    cliente = models.ForeignKey(
        Cliente, on_delete=models.CASCADE, related_name="documentos"
    )

    class Meta(DocumentoBase.Meta):
        verbose_name = "documento do cliente"
        verbose_name_plural = "documentos dos clientes"

    def __str__(self):
        return f"{self.tipo} - {self.cliente.pessoa}"


class DocumentoFuncionario(DocumentoBase):
    funcionario = models.ForeignKey(
        Funcionario, on_delete=models.CASCADE, related_name="documentos"
    )

    class Meta(DocumentoBase.Meta):
        verbose_name = "documento do funcionário"
        verbose_name_plural = "documentos dos funcionários"

    def __str__(self):
        return f"{self.tipo} - {self.funcionario.pessoa}"


class DocumentoVeiculo(DocumentoBase):
    veiculo = models.ForeignKey(
        Veiculo, on_delete=models.CASCADE, related_name="documentos"
    )

    class Meta(DocumentoBase.Meta):
        verbose_name = "documento do veículo"
        verbose_name_plural = "documentos dos veículos"

    def __str__(self):
        return f"{self.tipo} - {self.veiculo.marca.nome} {self.veiculo.modelo}"
