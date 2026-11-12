from datetime import date
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from ninja_jwt.tokens import RefreshToken
from PIL import Image

from sales.enums import ItemCompra, StatusCompra
from sales.models import Compra
from stock.models import CategoriaProduto, Lote, Produto
from stock.tests import criar_funcionario_e_login

from .models import ContaPagar, ContaReceber, Despesa, Receita


def _png_bytes() -> bytes:
    saida = BytesIO()
    Image.new("RGB", (8, 8), (10, 120, 200)).save(saida, format="PNG")
    return saida.getvalue()


class ComprovanteContaReceberTests(TestCase):
    def setUp(self):
        admin = get_user_model().objects.create_superuser("admin", "admin@example.com", "Senha!2026")
        self.client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {RefreshToken.for_user(admin).access_token}"
        receita = Receita.objects.create(descricao="Venda", categoria="Vendas", valor=1000, data=date(2026, 8, 1))
        self.conta = ContaReceber.objects.create(
            receita=receita, descricao="Parcela 1", valor=1000, data_vencimento=date(2026, 8, 10)
        )
        self.url = f"/api/financeiro/contas-receber/{self.conta.id}/comprovante"

    def enviar(self, nome, conteudo, tipo="application/octet-stream"):
        return self.client.post(self.url, {"arquivo": SimpleUploadedFile(nome, conteudo, content_type=tipo)})

    def test_conta_nasce_sem_comprovante(self):
        conta = self.client.get(f"/api/financeiro/contas-receber/{self.conta.id}").json()
        self.assertFalse(conta["tem_comprovante"])
        self.assertEqual(self.client.get(self.url).status_code, 404)

    def test_envia_imagem_baixa_e_remove(self):
        resposta = self.enviar("pix.png", _png_bytes(), "image/png")
        self.assertEqual(resposta.status_code, 200, resposta.content)
        self.assertTrue(resposta.json()["tem_comprovante"])
        self.assertEqual(resposta.json()["comprovante_nome"], "pix.png")

        baixado = self.client.get(self.url)
        self.assertEqual(baixado.status_code, 200)
        self.assertEqual(baixado["Content-Type"], "image/png")
        self.assertEqual(baixado.content, _png_bytes())

        lista = self.client.get("/api/financeiro/contas-receber").json()["items"]
        self.assertTrue(lista[0]["tem_comprovante"])

        removido = self.client.delete(self.url)
        self.assertEqual(removido.status_code, 200, removido.content)
        self.assertFalse(removido.json()["tem_comprovante"])

    def test_envia_pdf_e_o_tipo_vem_do_conteudo(self):
        resposta = self.enviar("recibo.jpg", b"%PDF-1.4\n%fake\n", "image/jpeg")  # extensão mentirosa
        self.assertEqual(resposta.status_code, 200, resposta.content)
        self.assertEqual(self.client.get(self.url)["Content-Type"], "application/pdf")

    def test_recusa_arquivo_que_nao_e_foto_nem_pdf(self):
        self.assertEqual(self.enviar("virus.pdf", b"MZ\x90\x00 programa", "application/pdf").status_code, 422)
        self.assertEqual(self.enviar("texto.png", b"so um texto", "image/png").status_code, 422)

    def test_recusa_arquivo_maior_que_o_limite(self):
        grande = b"%PDF-" + b"0" * (5 * 1024 * 1024)
        self.assertEqual(self.enviar("grande.pdf", grande, "application/pdf").status_code, 422)

    def test_novo_envio_substitui_o_anterior(self):
        self.enviar("a.pdf", b"%PDF-1.4 a", "application/pdf")
        self.enviar("b.png", _png_bytes(), "image/png")
        self.assertEqual(self.client.get(self.url)["Content-Type"], "image/png")
        self.assertEqual(ContaReceber.objects.get().comprovante_nome, "b.png")


class ComprovantePagarECompraTests(TestCase):
    """O mesmo comprovante (foto ou PDF) vale para contas a pagar e para compras."""

    def setUp(self):
        admin = criar_funcionario_e_login(self.client)
        despesa = Despesa.objects.create(descricao="Luz", categoria="Consumo", valor=300, data=date(2026, 8, 1))
        self.conta = ContaPagar.objects.create(
            despesa=despesa, descricao="Conta de luz", valor=300, data_vencimento=date(2026, 8, 10)
        )
        lote = Lote.objects.create(
            quantidade=3,
            numero_lote="L1",
            produto=Produto.objects.create(nome="Cera", categoria=CategoriaProduto.objects.create(nome="Limpeza")),
        )
        self.compra = Compra.objects.create(
            funcionario_id=admin.funcionario_id,
            lote=lote,
            item_compra=ItemCompra.PRODUTO,
            valor_compra=90,
            data_compra=date(2026, 8, 2),
            status=StatusCompra.CONCLUIDA,
        )
        self.urls = {
            "conta a pagar": f"/api/financeiro/contas-pagar/{self.conta.id}",
            "compra": f"/api/compras/{self.compra.id}",
        }

    def test_envia_baixa_e_remove_nos_dois_casos(self):
        for rotulo, base in self.urls.items():
            with self.subTest(rotulo):
                url = f"{base}/comprovante"
                self.assertFalse(self.client.get(base).json()["tem_comprovante"])
                enviado = self.client.post(url, {"arquivo": SimpleUploadedFile("pix.png", _png_bytes(), content_type="image/png")})
                self.assertEqual(enviado.status_code, 200, enviado.content)
                self.assertTrue(enviado.json()["tem_comprovante"])
                self.assertEqual(enviado.json()["comprovante_nome"], "pix.png")
                baixado = self.client.get(url)
                self.assertEqual((baixado.status_code, baixado["Content-Type"]), (200, "image/png"))
                self.assertTrue(self.client.get(base).json()["tem_comprovante"])
                self.assertFalse(self.client.delete(url).json()["tem_comprovante"])
                self.assertEqual(self.client.get(url).status_code, 404)

    def test_recusa_arquivo_invalido_nos_dois_casos(self):
        for rotulo, base in self.urls.items():
            with self.subTest(rotulo):
                resposta = self.client.post(
                    f"{base}/comprovante", {"arquivo": SimpleUploadedFile("x.pdf", b"nao e pdf", content_type="application/pdf")}
                )
                self.assertEqual(resposta.status_code, 422, resposta.content)
