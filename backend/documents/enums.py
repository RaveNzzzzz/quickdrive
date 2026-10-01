from django.db import models


class SituacaoDocumento(models.TextChoices):
    REGULAR = "REGULAR", "Regular"
    VENCIDO = "VENCIDO", "Vencido"
    PENDENTE = "PENDENTE", "Pendente"
