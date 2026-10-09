from django.core.exceptions import ValidationError
from django.db import models

from core.models import TimeStampedModel

from .enums import UF, TipoPessoa
from .validators import apenas_digitos, cep_valido, cnpj_valido, telefone_valido


class Pessoa(TimeStampedModel):
    nome = models.CharField("nome", max_length=200)
    email = models.EmailField("email", unique=True)
    telefone = models.CharField("telefone", max_length=11, validators=[apenas_digitos, telefone_valido])
    data_nascimento = models.DateField("data de nascimento ou abertura", null=True, blank=True)
    cpf_cnpj = models.CharField("cpf ou cnpj", max_length=14, unique=True, validators=[apenas_digitos])
    tipo_pessoa = models.CharField(
        "tipo de pessoa",
        max_length=10,
        choices=TipoPessoa.choices,
        default=TipoPessoa.FISICA,
    )

    class Meta:
        verbose_name = "pessoa"
        verbose_name_plural = "pessoas"
        ordering = ["nome"]

    def __str__(self):
        return self.nome

    def clean(self):
        doc = self.cpf_cnpj or ""
        if self.tipo_pessoa == TipoPessoa.FISICA and (len(doc) != 11 or not doc.isdigit()):
            raise ValidationError({"cpf_cnpj": "O CPF deve conter 11 dígitos."})
        if self.tipo_pessoa == TipoPessoa.JURIDICA and not cnpj_valido(doc):
            raise ValidationError({"cpf_cnpj": "CNPJ inválido."})


class Endereco(TimeStampedModel):
    pessoa = models.OneToOneField(Pessoa, on_delete=models.CASCADE, related_name="endereco")
    rua = models.CharField("rua", max_length=200)
    numero = models.CharField("número", max_length=20)
    complemento = models.CharField("complemento", max_length=200, blank=True)
    bairro = models.CharField("bairro", max_length=100)
    cidade = models.CharField("cidade", max_length=100)
    uf = models.CharField("estado", max_length=2, choices=UF.choices)
    cep = models.CharField("cep", max_length=8, validators=[apenas_digitos, cep_valido])

    class Meta:
        verbose_name = "endereço"
        verbose_name_plural = "endereços"

    def __str__(self):
        linha = f"{self.rua}, {self.numero}"
        if self.complemento:
            linha += f" - {self.complemento}"
        return f"{linha}, {self.bairro} - {self.cidade}/{self.uf}"
