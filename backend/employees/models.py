import uuid

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models, transaction

from core.models import TimeStampedModel
from people.enums import TipoPessoa
from people.models import Pessoa

from .enums import TipoConta, TipoContratacao


class Setor(TimeStampedModel):
    nome = models.CharField("nome", max_length=100, unique=True)

    class Meta:
        verbose_name = "setor"
        verbose_name_plural = "setores"
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class Cargo(TimeStampedModel):
    nome = models.CharField("nome", max_length=100)
    descricao = models.CharField("descrição", max_length=200, blank=True)

    setor = models.ForeignKey(Setor, on_delete=models.RESTRICT, related_name="cargos")

    class Meta:
        verbose_name = "cargo"
        verbose_name_plural = "cargos"
        ordering = ["setor__nome", "nome"]
        constraints = [models.UniqueConstraint(fields=["setor", "nome"], name="cargo_unico_por_setor")]

    def __str__(self):
        return f"{self.nome} ({self.setor})"


class Funcionario(TimeStampedModel):
    pessoa = models.OneToOneField(Pessoa, on_delete=models.PROTECT, related_name="funcionario")
    cargo = models.ForeignKey(Cargo, on_delete=models.RESTRICT, related_name="funcionarios")

    codigo = models.UUIDField("código", default=uuid.uuid4, unique=True, editable=False)
    ativo = models.BooleanField("ativo", default=True, db_index=True)
    salario = models.DecimalField(
        "salário",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    comissao = models.DecimalField(
        "comissão (%)",
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    data_admissao = models.DateField("data de admissão")
    inicio_expediente = models.TimeField("início do expediente")
    final_expediente = models.TimeField("final do expediente")
    regime_contratacao = models.CharField("regime de contratação", max_length=20, choices=TipoContratacao.choices)

    banco = models.CharField("banco", max_length=100)
    agencia = models.CharField("agência", max_length=20)
    numero_conta = models.CharField("número da conta", max_length=20)
    tipo_conta = models.CharField("tipo da conta", max_length=10, choices=TipoConta.choices)
    chave_pix = models.CharField("chave pix", max_length=77, blank=True)

    class Meta:
        verbose_name = "funcionário"
        verbose_name_plural = "funcionários"
        ordering = ["pessoa__nome"]

    def __str__(self):
        return f"{self.pessoa} ({self.codigo})"

    def clean(self):
        if self.pessoa_id and self.pessoa.tipo_pessoa != TipoPessoa.FISICA:
            raise ValidationError({"pessoa": "Funcionário deve ser pessoa física."})


class Desligamento(TimeStampedModel):
    funcionario = models.OneToOneField(Funcionario, on_delete=models.PROTECT, related_name="desligamento")
    data_desligamento = models.DateField("data de desligamento")
    motivo = models.CharField("motivo", max_length=200)
    observacoes = models.TextField("observações", blank=True)

    class Meta:
        verbose_name = "desligamento"
        verbose_name_plural = "desligamentos"
        ordering = ["-data_desligamento"]

    def __str__(self):
        return f"{self.funcionario.pessoa} - {self.data_desligamento}"

    def clean(self):
        if self.funcionario_id and self.data_desligamento and self.data_desligamento < self.funcionario.data_admissao:
            raise ValidationError({"data_desligamento": "Não pode ser anterior à admissão."})

    def save(self, *args, **kwargs):
        with transaction.atomic():
            super().save(*args, **kwargs)
            if self.funcionario.ativo:
                self.funcionario.ativo = False
                self.funcionario.save(update_fields=["ativo", "updated_at"])
