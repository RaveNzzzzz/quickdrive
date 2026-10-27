from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from core.models import TimeStampedModel

from .enums import FormaPagamento, ItemCompra, StatusCompra, StatusVenda

VALOR_POSITIVO = [MinValueValidator(Decimal("0.01"))]


class Venda(TimeStampedModel):
    veiculo = models.ForeignKey("vehicles.Veiculo", on_delete=models.PROTECT, related_name="vendas")
    cliente = models.ForeignKey("customers.Cliente", on_delete=models.PROTECT, related_name="vendas")
    funcionario = models.ForeignKey("employees.Funcionario", on_delete=models.PROTECT, related_name="vendas")

    valor_venda = models.DecimalField("valor da venda", max_digits=12, decimal_places=2, validators=VALOR_POSITIVO)
    forma_pagamento = models.CharField("forma de pagamento", max_length=20, choices=FormaPagamento.choices)
    status = models.CharField("status", max_length=20, choices=StatusVenda.choices, default=StatusVenda.PENDENTE)
    data_venda = models.DateField("data da venda")

    class Meta:
        verbose_name = "venda"
        verbose_name_plural = "vendas"
        ordering = ["-data_venda"]
        constraints = [
            # Um veículo só pode ter uma venda ativa; vendas canceladas não contam.
            models.UniqueConstraint(
                fields=["veiculo"],
                condition=~models.Q(status=StatusVenda.CANCELADA),
                name="venda_ativa_unica_por_veiculo",
            ),
        ]

    def __str__(self):
        return f"Venda {self.pk} - {self.veiculo}"


class Compra(TimeStampedModel):
    """O que a loja compra: um veículo (ex.: de um cliente) ou um lote de produtos."""

    funcionario = models.ForeignKey("employees.Funcionario", on_delete=models.PROTECT, related_name="compras")
    cliente = models.ForeignKey(
        "customers.Cliente", on_delete=models.PROTECT, related_name="compras", null=True, blank=True
    )
    veiculo = models.ForeignKey(
        "vehicles.Veiculo", on_delete=models.PROTECT, related_name="compras", null=True, blank=True
    )
    lote = models.ForeignKey("stock.Lote", on_delete=models.PROTECT, related_name="compras", null=True, blank=True)

    item_compra = models.CharField("item da compra", max_length=20, choices=ItemCompra.choices)
    valor_compra = models.DecimalField("valor da compra", max_digits=12, decimal_places=2, validators=VALOR_POSITIVO)
    forma_pagamento = models.CharField("forma de pagamento", max_length=20, choices=FormaPagamento.choices)
    status = models.CharField("status", max_length=20, choices=StatusCompra.choices, default=StatusCompra.PENDENTE)
    data_compra = models.DateField("data da compra")

    class Meta:
        verbose_name = "compra"
        verbose_name_plural = "compras"
        ordering = ["-data_compra"]

    def __str__(self):
        return f"Compra {self.pk} - {self.get_item_compra_display()}"

    def clean(self):
        # O tipo do item define qual FK precisa estar preenchida.
        if self.item_compra == ItemCompra.VEICULO and (not self.veiculo_id or self.lote_id):
            raise ValidationError({"veiculo": "Compra de veículo precisa de um veículo e não pode ter lote."})
        if self.item_compra == ItemCompra.PRODUTO and (not self.lote_id or self.veiculo_id):
            raise ValidationError({"lote": "Compra de produto precisa de um lote e não pode ter veículo."})
