from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from core.models import TimeStampedModel

from .enums import (
    EtapaNegociacao,
    FormaPagamento,
    ItemCompra,
    MotivoPerda,
    OrigemNegociacao,
    StatusCompra,
    StatusVenda,
)

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


class Negociacao(TimeStampedModel):
    """Um cartão do funil de vendas: alguém interessado em comprar, do primeiro contato até a venda (ou a perda).

    O interessado começa só com nome e telefone. Ele vira um Cliente completo (CPF, endereço...)
    apenas na hora da venda, quando esses dados são de fato necessários.
    """

    nome_interessado = models.CharField("nome do interessado", max_length=200)
    telefone = models.CharField("telefone", max_length=11, blank=True)
    cliente = models.ForeignKey(
        "customers.Cliente", on_delete=models.PROTECT, related_name="negociacoes", null=True, blank=True
    )
    veiculo = models.ForeignKey(
        "vehicles.Veiculo", on_delete=models.SET_NULL, related_name="negociacoes", null=True, blank=True
    )
    funcionario = models.ForeignKey("employees.Funcionario", on_delete=models.PROTECT, related_name="negociacoes")
    venda = models.OneToOneField(Venda, on_delete=models.SET_NULL, related_name="negociacao", null=True, blank=True)

    etapa = models.CharField(
        "etapa", max_length=20, choices=EtapaNegociacao.choices, default=EtapaNegociacao.INTERESSE, db_index=True
    )
    # Guardamos QUANDO entrou na etapa (e não "quantos dias"), para a contagem de dias andar sozinha.
    etapa_desde = models.DateTimeField("na etapa desde", default=timezone.now)
    ordem = models.PositiveIntegerField("ordem na coluna", default=0)

    origem = models.CharField(
        "origem", max_length=20, choices=OrigemNegociacao.choices, default=OrigemNegociacao.OUTRO
    )
    valor_proposta = models.DecimalField(
        "valor da proposta", max_digits=12, decimal_places=2, null=True, blank=True, validators=VALOR_POSITIVO
    )
    proximo_passo = models.CharField("próximo passo", max_length=200, blank=True)
    proximo_contato = models.DateField("data do próximo contato", null=True, blank=True)
    motivo_perda = models.CharField("motivo da perda", max_length=20, choices=MotivoPerda.choices, blank=True)

    class Meta:
        verbose_name = "negociação"
        verbose_name_plural = "negociações"
        ordering = ["ordem", "id"]

    def __str__(self):
        return f"{self.nome_interessado} ({self.get_etapa_display()})"


class NegociacaoEvento(models.Model):
    """Histórico: um registro cada vez que a negociação é criada ou muda de etapa."""

    negociacao = models.ForeignKey(Negociacao, on_delete=models.CASCADE, related_name="eventos")
    etapa_anterior = models.CharField("etapa anterior", max_length=20, choices=EtapaNegociacao.choices, blank=True)
    etapa_nova = models.CharField("etapa nova", max_length=20, choices=EtapaNegociacao.choices)
    funcionario = models.ForeignKey(
        "employees.Funcionario", on_delete=models.SET_NULL, related_name="+", null=True, blank=True
    )
    data = models.DateTimeField("data", auto_now_add=True)

    class Meta:
        verbose_name = "evento da negociação"
        verbose_name_plural = "eventos da negociação"
        ordering = ["data", "id"]
