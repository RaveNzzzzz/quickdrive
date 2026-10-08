from django.core.exceptions import ValidationError
from django.db import models

from core.models import TimeStampedModel
from employees.models import Funcionario, Setor

from .enums import REGRAS_PADRAO, ImportanciaNotificacao, TipoRegra


class Notificacao(TimeStampedModel):
    titulo = models.CharField("título", max_length=150)
    mensagem = models.TextField("mensagem")
    tipo = models.CharField("tipo", max_length=50)
    chave = models.CharField(
        "chave de origem",
        max_length=200,
        unique=True,
        null=True,
        blank=True,
        editable=False,
    )
    importancia = models.CharField(
        "importância",
        max_length=10,
        choices=ImportanciaNotificacao.choices,
        default=ImportanciaNotificacao.MEDIA,
        db_index=True,
    )
    funcionarios = models.ManyToManyField(
        Funcionario, through="Destinatario", related_name="notificacoes"
    )

    class Meta:
        verbose_name = "notificação"
        verbose_name_plural = "notificações"
        ordering = ["-created_at"]

    def __str__(self):
        return self.titulo


class Destinatario(TimeStampedModel):
    notificacao = models.ForeignKey(
        Notificacao, on_delete=models.CASCADE, related_name="destinatarios"
    )
    funcionario = models.ForeignKey(
        Funcionario, on_delete=models.CASCADE, related_name="notificacoes_recebidas"
    )
    lida = models.BooleanField("lida", default=False)
    lida_em = models.DateTimeField("lida em", null=True, blank=True)

    class Meta:
        verbose_name = "destinatário"
        verbose_name_plural = "destinatários"
        ordering = ["-notificacao__created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["notificacao", "funcionario"],
                name="destinatario_unico_por_notificacao",
            )
        ]
        indexes = [models.Index(fields=["funcionario", "lida"])]

    def __str__(self):
        return f"{self.notificacao} -> {self.funcionario.pessoa}"


class RegraNotificacao(TimeStampedModel):
    tipo = models.CharField(
        "tipo", max_length=30, choices=TipoRegra.choices, unique=True
    )
    ativa = models.BooleanField("ativa", default=True)
    dias = models.PositiveIntegerField(
        "dias",
        null=True,
        blank=True,
        help_text="Antecedência (documentos e validade) ou tempo limite (pátio). Ignorado nos demais tipos.",
    )
    importancia = models.CharField(
        "importância", max_length=10, choices=ImportanciaNotificacao.choices
    )
    setores_destino = models.ManyToManyField(
        Setor,
        blank=True,
        related_name="+",
        help_text="Vazio = todos os funcionários ativos.",
    )

    class Meta:
        verbose_name = "regra de notificação"
        verbose_name_plural = "regras de notificação"
        ordering = ["tipo"]

    def __str__(self):
        return self.get_tipo_display()

    def clean(self):
        usa_dias = REGRAS_PADRAO[self.tipo][0] is not None
        if usa_dias and self.dias is None:
            raise ValidationError({"dias": "Obrigatório para este tipo de regra."})
