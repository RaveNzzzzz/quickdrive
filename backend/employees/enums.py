from django.db import models


class TipoContratacao(models.TextChoices):
    CLT = "CLT", "CLT"
    PJ = "PJ", "PJ"
    ESTAGIARIO = "ESTAGIARIO", "Estagiário"
    JOVEM_APRENDIZ = "JOVEM_APRENDIZ", "Jovem Aprendiz"
    FREELANCER = "FREELANCER", "Freelancer"


class TipoConta(models.TextChoices):
    CORRENTE = "CORRENTE", "Corrente"
    POUPANCA = "POUPANCA", "Poupança"
    SALARIO = "SALARIO", "Salário"
