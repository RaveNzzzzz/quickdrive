from django.db import models
from django.utils import timezone

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

class Modelo(models.Model):
    """Modelo de veículo cadastrado (ex.: Impreza WRX), sempre de uma marca."""

    nome = models.CharField(max_length=60)
    marca = models.ForeignKey(Marca, on_delete=models.PROTECT, related_name="modelos")

    class Meta:
        ordering = ["nome"]
        constraints = [models.UniqueConstraint(fields=["marca", "nome"], name="modelo_unico_por_marca")]

    def __str__(self):
        return f"{self.marca} {self.nome}"


class Vaga(models.Model):
    """Vaga do pátio onde o veículo fica, com a posição dela na loja (ex.: frente da loja, destaque, depósito)."""

    nome = models.CharField(max_length=10, unique=True)
    posicao = models.CharField(max_length=60, blank=True, default="")

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return f"{self.nome} ({self.posicao})" if self.posicao else self.nome


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
    # `modelo` e `vaga` (texto) guardam o nome do cadastro escolhido: o resto do sistema continua lendo o texto.
    vaga = models.CharField(max_length=10, blank=True, default="")
    modelo_cadastro = models.ForeignKey(Modelo, on_delete=models.PROTECT, null=True, blank=True, related_name="veiculos")
    vaga_cadastro = models.ForeignKey(Vaga, on_delete=models.PROTECT, null=True, blank=True, related_name="veiculos")
    custo_aquisicao = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    observacoes = models.TextField(blank=True, default="")

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


class ProdutoUtilizado(models.Model):
    """Produto do estoque usado num procedimento (preparação) do veículo.

    Guarda de qual lote saiu a quantidade (um procedimento pode usar mais de um lote do mesmo
    produto) e o valor unitário usado no cálculo, para poder devolver ao estoque se for excluído.
    """

    preparacao = models.ForeignKey(Preparacao, on_delete=models.CASCADE, related_name="produtos_utilizados")
    produto = models.ForeignKey("stock.Produto", on_delete=models.PROTECT, related_name="usos_em_veiculos")
    lote = models.ForeignKey("stock.Lote", on_delete=models.PROTECT, related_name="usos_em_veiculos")
    quantidade = models.PositiveIntegerField()
    valor_unitario = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.quantidade} x {self.produto.nome} ({self.preparacao_id})"


class Revisao(models.Model):

    nome = models.CharField(max_length=100)
    custo = models.DecimalField(max_digits=10, decimal_places=2)
    data = models.DateField()
    status = models.CharField(max_length=20, choices=StatusRevisao.choices, default=StatusRevisao.PENDENTE)
    veiculo = models.ForeignKey(Veiculo, on_delete=models.CASCADE, related_name="revisoes")


class Imagem(models.Model):
    """Foto do veículo guardada DENTRO do banco (coluna bytea no Postgres). Um veículo pode ter várias."""

    arquivo = models.BinaryField(default=b"", editable=False)
    content_type = models.CharField(max_length=50, default="image/jpeg")
    nome = models.CharField(max_length=255, blank=True, default="")
    principal = models.BooleanField(default=False)
    ordem = models.PositiveIntegerField(default=0)  # define a posição no carrossel
    atualizado_em = models.DateTimeField(auto_now=True)
    veiculo = models.ForeignKey(Veiculo, on_delete=models.CASCADE, related_name="imagens")

    class Meta:
        ordering = ["ordem", "id"]

    def __str__(self):
        return f"Imagem {self.pk} de {self.veiculo_id}"


class OpcionalVeiculo(models.Model):
    """Item de série/opcional do veículo (ar-condicionado, ABS...). Texto livre: não há lista pré-cadastrada."""

    veiculo = models.ForeignKey(Veiculo, on_delete=models.CASCADE, related_name="opcionais")
    nome = models.CharField(max_length=60)

    class Meta:
        ordering = ["nome", "id"]
        constraints = [models.UniqueConstraint(fields=["veiculo", "nome"], name="opcional_unico_por_veiculo")]

    def __str__(self):
        return f"{self.nome} ({self.veiculo_id})"


class SinistroVeiculo(models.Model):
    """Histórico de sinistro do veículo: no máximo um registro por veículo."""

    veiculo = models.OneToOneField(Veiculo, on_delete=models.CASCADE, related_name="sinistro")
    teve_sinistro = models.BooleanField(default=False)
    de_leilao = models.BooleanField(default=False, help_text="O veículo veio de leilão")
    perda_total = models.BooleanField(default=False, help_text="Deu perda total (PT)")
    descricao = models.TextField(blank=True, default="")

    def __str__(self):
        return f"Sinistro do veículo {self.veiculo_id}"


class DocumentoVeiculo(models.Model):
    """Situação de um documento do veículo (CRLV, IPVA, laudo...). Só o status; o arquivo não é guardado aqui."""

    veiculo = models.ForeignKey(Veiculo, on_delete=models.CASCADE, related_name="documentos")
    nome = models.CharField(max_length=60)
    situacao = models.CharField(max_length=30, help_text='Texto exibido, ex.: "Em dia", "Pago", "Pendente"')
    regular = models.BooleanField(default=True, help_text="False = pendência (aparece com o ícone de relógio)")

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.nome} ({self.veiculo_id})"


class HistoricoVeiculo(models.Model):
    """Linha do tempo do veículo no pátio."""

    veiculo = models.ForeignKey(Veiculo, on_delete=models.CASCADE, related_name="historico")
    titulo = models.CharField(max_length=100)
    data_hora = models.DateTimeField(default=timezone.now)
    positivo = models.BooleanField(default=False, help_text="Destaca o marco em verde (ex.: proposta recebida)")

    class Meta:
        ordering = ["data_hora", "id"]

    def __str__(self):
        return f"{self.titulo} ({self.veiculo_id})"
