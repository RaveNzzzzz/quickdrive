import uuid

from django.db import models

from core.models import TimeStampedModel
from people.models import Pessoa


class Cliente(TimeStampedModel):
    pessoa = models.OneToOneField(
        Pessoa, on_delete=models.PROTECT, related_name="cliente"
    )

    codigo = models.UUIDField("código", default=uuid.uuid4, unique=True, editable=False)
    ativo = models.BooleanField("ativo", default=True, db_index=True)
    ultima_interacao = models.DateTimeField("última interação", null=True, blank=True)

    class Meta:
        verbose_name = "cliente"
        verbose_name_plural = "clientes"
        ordering = ["pessoa__nome"]

    def __str__(self):
        return f"{self.pessoa} ({self.codigo})"
