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


class EtapaNegociacao(models.TextChoices):
    INTERESSE = "interesse", "Interesse"
    TEST_DRIVE = "test_drive", "Test drive"
    NEGOCIACAO = "negociacao", "Negociação"
    CREDITO = "credito", "Crédito"
    VENDIDO = "vendido", "Vendido"
    PERDIDO = "perdido", "Perdido"


class OrigemNegociacao(models.TextChoices):
    INSTAGRAM = "instagram", "Instagram"
    INDICACAO = "indicacao", "Indicação"
    SITE = "site", "Site próprio"
    LOJA = "loja", "Loja física"
    OLX = "olx", "Portal OLX"
    WEBMOTORS = "webmotors", "Portal Webmotors"
    OUTRO = "outro", "Outro"


class MotivoPerda(models.TextChoices):
    PRECO = "preco", "Preço"
    CREDITO = "credito", "Crédito negado"
    CONCORRENTE = "concorrente", "Comprou em outro lugar"
    DESISTIU = "desistiu", "Desistiu da compra"
    SEM_RETORNO = "sem_retorno", "Sem retorno"
    OUTRO = "outro", "Outro"
