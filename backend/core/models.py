from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class ComprovanteMixin(models.Model):
    """Comprovante de pagamento (foto ou PDF) guardado no próprio banco, como as fotos dos veículos."""

    comprovante = models.BinaryField(default=b"", editable=False)
    comprovante_nome = models.CharField(max_length=255, blank=True, default="")
    comprovante_tipo = models.CharField(max_length=50, blank=True, default="")
    comprovante_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    @property
    def tem_comprovante(self) -> bool:
        # Só olha o tipo (o conteúdo costuma estar "deferido" e não é lido nas listagens).
        return bool(self.comprovante_tipo)
