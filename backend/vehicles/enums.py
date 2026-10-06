from django.db import models

class StatusPreparacao(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        EM_ANDAMENTO = "em_andamento", "Em andamento"
        CONCLUIDO = "concluido", "Concluído"

class StatusRevisao(models.TextChoices):
    PENDENTE = "pendente", "Pendente"
    EM_ANDAMENTO = "em_andamento", "Em andamento"
    CONCLUIDO = "concluido", "Concluído"

class StatusVeiculo(models.TextChoices):
    DISPONIVEL = "disponivel", "Disponível"
    RESERVADO = "reservado", "Reservado"
    PREPARACAO = "preparacao", "Em preparação"
    VENDIDO = "vendido", "Vendido"
    MANUTENCAO = "manutencao", "Em manutenção"