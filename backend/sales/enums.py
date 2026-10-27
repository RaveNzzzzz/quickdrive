from django.db import models


class FormaPagamento(models.TextChoices):
    DINHEIRO = "dinheiro", "Dinheiro"
    PIX = "pix", "PIX"
    CARTAO_DEBITO = "cartao_debito", "Cartão de débito"
    CARTAO_CREDITO = "cartao_credito", "Cartão de crédito"
    BOLETO = "boleto", "Boleto"
    TRANSFERENCIA = "transferencia", "Transferência"
    FINANCIAMENTO = "financiamento", "Financiamento"
    CONSORCIO = "consorcio", "Consórcio"


class StatusVenda(models.TextChoices):
    PENDENTE = "pendente", "Pendente"
    PAGO = "pago", "Pago"
    CANCELADA = "cancelada", "Cancelada"


class StatusCompra(models.TextChoices):
    PENDENTE = "pendente", "Pendente"
    CONCLUIDA = "concluida", "Concluída"
    CANCELADA = "cancelada", "Cancelada"


class ItemCompra(models.TextChoices):
    VEICULO = "veiculo", "Veículo"
    PRODUTO = "produto", "Produto"
