from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from core.models import TimeStampedModel

from .enums import StatusContaPagar, StatusContaReceber

VALOR_POSITIVO = [MinValueValidator(Decimal("0.01"))]


class Receita(TimeStampedModel):
    descricao = models.CharField("descrição", max_length=200)
    categoria = models.CharField("categoria", max_length=60)
    valor = models.DecimalField("valor", max_digits=12, decimal_places=2, validators=VALOR_POSITIVO)
    data = models.DateField("data")

    class Meta:
        verbose_name = "receita"
        verbose_name_plural = "receitas"
        ordering = ["-data"]

    def __str__(self):
        return f"{self.descricao} ({self.data})"


class Despesa(TimeStampedModel):
    descricao = models.CharField("descrição", max_length=200)
    categoria = models.CharField("categoria", max_length=60)
    valor = models.DecimalField("valor", max_digits=12, decimal_places=2, validators=VALOR_POSITIVO)
    data = models.DateField("data")

    class Meta:
        verbose_name = "despesa"
        verbose_name_plural = "despesas"
        ordering = ["-data"]

    def __str__(self):
        return f"{self.descricao} ({self.data})"


class ContaReceber(TimeStampedModel):
    """Uma parcela a receber. Uma receita (ou uma venda) pode gerar várias contas."""

    receita = models.ForeignKey(Receita, on_delete=models.PROTECT, related_name="contas_receber")
    venda = models.ForeignKey(
        "sales.Venda", on_delete=models.PROTECT, related_name="contas_receber", null=True, blank=True
    )

    descricao = models.CharField("descrição", max_length=200)
    valor = models.DecimalField("valor", max_digits=12, decimal_places=2, validators=VALOR_POSITIVO)
    data_vencimento = models.DateField("data de vencimento")
    data_recebimento = models.DateField("data de recebimento", null=True, blank=True)
    status = models.CharField(
        "status", max_length=20, choices=StatusContaReceber.choices, default=StatusContaReceber.PENDENTE
    )

    class Meta:
        verbose_name = "conta a receber"
        verbose_name_plural = "contas a receber"
        ordering = ["data_vencimento"]

    def __str__(self):
        return f"{self.descricao} - venc. {self.data_vencimento}"

    def clean(self):
        if self.status == StatusContaReceber.RECEBIDO and not self.data_recebimento:
            raise ValidationError({"data_recebimento": "Informe a data em que a conta foi recebida."})


class ContaPagar(TimeStampedModel):
    """Uma parcela a pagar. Uma despesa (ou uma compra) pode gerar várias contas."""

    despesa = models.ForeignKey(Despesa, on_delete=models.PROTECT, related_name="contas_pagar")
    compra = models.ForeignKey(
        "sales.Compra", on_delete=models.PROTECT, related_name="contas_pagar", null=True, blank=True
    )

    descricao = models.CharField("descrição", max_length=200)
    valor = models.DecimalField("valor", max_digits=12, decimal_places=2, validators=VALOR_POSITIVO)
    data_vencimento = models.DateField("data de vencimento")
    data_pagamento = models.DateField("data de pagamento", null=True, blank=True)
    status = models.CharField("status", max_length=20, choices=StatusContaPagar.choices, default=StatusContaPagar.PENDENTE)

    class Meta:
        verbose_name = "conta a pagar"
        verbose_name_plural = "contas a pagar"
        ordering = ["data_vencimento"]

    def __str__(self):
        return f"{self.descricao} - venc. {self.data_vencimento}"

    def clean(self):
        if self.status == StatusContaPagar.PAGO and not self.data_pagamento:
            raise ValidationError({"data_pagamento": "Informe a data em que a conta foi paga."})
