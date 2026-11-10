import uuid

from django.db import models


class RegistroRequisicao(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(db_index=True)
    metodo = models.CharField(max_length=16)
    rota = models.CharField(max_length=512)
    status_http = models.PositiveSmallIntegerField()
    duracao_ms = models.PositiveIntegerField()
    # Snapshot para preservar a autoria mesmo se o usuário for excluído.
    usuario_id = models.PositiveBigIntegerField(null=True, blank=True, db_index=True)
    token_fingerprint = models.CharField(max_length=64, blank=True, db_index=True)
    requisicao = models.JSONField(default=dict)
    resultado = models.JSONField(default=dict)

    class Meta:
        ordering = ["-timestamp", "-id"]
        verbose_name = "registro de requisição"
        verbose_name_plural = "registros de requisições"

    def __str__(self):
        return f"{self.metodo} {self.rota} — {self.status_http}"
