from django.db import models


class ImportanciaNotificacao(models.TextChoices):
    BAIXA = "BAIXA", "Baixa"
    MEDIA = "MEDIA", "Média"
    ALTA = "ALTA", "Alta"


class TipoRegra(models.TextChoices):
    DOCUMENTO_CLIENTE = "DOCUMENTO_CLIENTE", "Vencimento de documento de cliente"
    DOCUMENTO_FUNCIONARIO = (
        "DOCUMENTO_FUNCIONARIO",
        "Vencimento de documento de funcionário",
    )
    DOCUMENTO_VEICULO = "DOCUMENTO_VEICULO", "Vencimento de documento de veículo"
    CONTA_PAGAR = "CONTA_PAGAR", "Conta a pagar próxima do vencimento"
    CONTA_RECEBER = "CONTA_RECEBER", "Conta a receber próxima do vencimento"
    ESTOQUE_BAIXO = "ESTOQUE_BAIXO", "Produto em falta no estoque"
    PRODUTO_VALIDADE = "PRODUTO_VALIDADE", "Produto próximo da validade"
    VEICULO_PATIO = "VEICULO_PATIO", "Veículo há muito tempo no pátio"


REGRAS_PADRAO = {
    TipoRegra.DOCUMENTO_CLIENTE: (30, "MEDIA"),
    TipoRegra.DOCUMENTO_FUNCIONARIO: (30, "MEDIA"),
    TipoRegra.DOCUMENTO_VEICULO: (30, "ALTA"),
    TipoRegra.CONTA_PAGAR: (10, "ALTA"),
    TipoRegra.CONTA_RECEBER: (10, "ALTA"),
    TipoRegra.ESTOQUE_BAIXO: (None, "ALTA"),
    TipoRegra.PRODUTO_VALIDADE: (15, "ALTA"),
    TipoRegra.VEICULO_PATIO: (60, "MEDIA"),
}
