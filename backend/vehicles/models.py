from django.db import models
from .enums import StatusPreparacao, StatusRevisao, StatusVeiculo

class Marca(models.Model):
    nome = models.CharField(max_length=60)

    def __str__(self):
        return self.nome

class Cambio(models.Model):
    nome = models.CharField(max_length=60)

    def __str__(self):
        return self.nome

class Combustivel(models.Model):
    nome = models.CharField(max_length=60)

    def __str__(self):
        return self.nome

class Carroceria(models.Model):
    nome = models.CharField(max_length=60)

    def __str__(self):
        return self.nome

class Veiculo(models.Model):

    ano_modelo = models.PositiveIntegerField()
    ano_fabricacao = models.DateField()
    portas = models.PositiveSmallIntegerField()
    data_entrada = models.DateField(auto_now_add=True)
    quilometragem = models.PositiveIntegerField()
    lugares = models.PositiveSmallIntegerField()
    chassi = models.CharField(max_length=17, unique=True)
    versao = models.CharField(max_length=60)
    cor = models.CharField(max_length=30)
    porta_malas = models.PositiveIntegerField(help_text="Capacidade do porta-malas em litros")
    motorizacao = models.CharField(max_length=30)
    status = models.CharField(max_length=20, choices=StatusVeiculo.choices, default=StatusVeiculo.DISPONIVEL)
    renavam = models.CharField(max_length=20, unique=True)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    modelo = models.CharField(max_length=60)
    placa = models.CharField(max_length=8, unique=True)

    marca = models.ForeignKey(Marca, on_delete=models.PROTECT, related_name="veiculos")
    cambio = models.ForeignKey(Cambio, on_delete=models.PROTECT, related_name="veiculos")
    combustivel = models.ForeignKey(Combustivel, on_delete=models.PROTECT, related_name="veiculos")
    carroceria = models.ForeignKey(Carroceria, on_delete=models.PROTECT, related_name="veiculos")

    def __str__(self):
        return f"{self.marca} {self.modelo} ({self.placa})"

class Preparacao(models.Model):

    nome = models.CharField(max_length=100)
    custo = models.DecimalField(max_digits=10, decimal_places=2)
    data = models.DateField()
    status = models.CharField(max_length=20, choices=StatusPreparacao.choices, default=StatusPreparacao.PENDENTE)
    veiculo = models.ForeignKey(Veiculo, on_delete=models.CASCADE, related_name="preparacoes")


class Revisao(models.Model):

    nome = models.CharField(max_length=100)
    custo = models.DecimalField(max_digits=10, decimal_places=2)
    data = models.DateField()
    status = models.CharField(max_length=20, choices=StatusRevisao.choices, default=StatusRevisao.PENDENTE)
    veiculo = models.ForeignKey(Veiculo, on_delete=models.CASCADE, related_name="revisoes")


class Imagem(models.Model):
    imagem = models.ImageField(upload_to="veiculos/")
    principal = models.BooleanField(default=False)
    veiculo = models.ForeignKey(Veiculo, on_delete=models.CASCADE, related_name="imagens")