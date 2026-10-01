from django.db import models

# Models de CategoriaProduto, Produto e Lote 

class CategoriaProduto(models.Model):
    nome = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nome

class Produto(models.Model):
    nome = models.CharField(max_length=100)
    especificacao = models.TextField(blank=True)
    categoria = models.ForeignKey(CategoriaProduto, on_delete=models.PROTECT,related_name="produtos")

    def __str__(self):
        return self.nome    

class Lote(models.Model):   
    quantidade = models.PositiveIntegerField()
    data_validade = models.DateField(blank=True, null=True)
    numero_lote = models.CharField(max_length=50)
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT, related_name="lotes") # Muito foda esse negocio de related_name, pq tu acessa os lotes de um produto diretamente pelo produto, sem precisar fazer uma query separada. Ex: produto.lotes.all() retorna todos os lotes do produto.

    class Meta:  # Essa classe Meta cria uma constraint de unicidade para o modelo Lote, garantindo que não existam dois lotes com o mesmo número para o mesmo produto. Isso é importante para evitar duplicidade de lotes e garantir a integridade dos dados.
        constraints = [
            models.UniqueConstraint(
                fields=["produto", "numero_lote"],
                name="stock_lote_produto_numero_unique",
            ),
        ] 

    def __str__(self):
        return f"Lote {self.numero_lote} - {self.produto.nome}"
    produto_id = None
