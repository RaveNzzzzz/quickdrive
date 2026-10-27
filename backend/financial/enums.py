from django.db import models

# "Atrasado" e "vence hoje" não são guardados no banco: mudam sozinhos com o passar dos dias,
# então são calculados comparando data_vencimento com a data de hoje.


class StatusContaPagar(models.TextChoices):
    PENDENTE = "pendente", "Pendente"
    PAGO = "pago", "Pago"
    CANCELADO = "cancelado", "Cancelado"


class StatusContaReceber(models.TextChoices):
    PENDENTE = "pendente", "Pendente"
    RECEBIDO = "recebido", "Recebido"
    CANCELADO = "cancelado", "Cancelado"
