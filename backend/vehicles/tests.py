import json
from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from ninja_jwt.tokens import RefreshToken

from .models import Cambio, Carroceria, Combustivel, Marca


def _renavam_valido(base10: str) -> str:
    pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma = sum(int(d) * p for d, p in zip(base10, pesos))
    digito = (soma * 10) % 11
    return base10 + str(0 if digito == 10 else digito)


class FichaVeiculoTests(TestCase):
    def setUp(self):
        admin = get_user_model().objects.create_superuser("admin", "admin@example.com", "Senha!2026")
        self.client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {RefreshToken.for_user(admin).access_token}"
        ano = date.today().year - 1
        self.payload = {
            "ano_modelo": ano,
            "ano_fabricacao": f"{ano}-03-10",
            "portas": 4,
            "quilometragem": 38400,
            "lugares": 5,
            "chassi": "9BWZZZ377VT004251",
            "versao": "STI",
            "cor": "Azul",
            "porta_malas": 460,
            "motorizacao": "2.0 turbo",
            "renavam": _renavam_valido("1234567890"),
            "valor": "130000.00",
            "modelo": "Impreza WRX",
            "placa": "QDA1101",
            "marca_id": Marca.objects.create(nome="Subaru").id,
            "cambio_id": Cambio.objects.create(nome="Manual").id,
            "combustivel_id": Combustivel.objects.create(nome="Gasolina").id,
            "carroceria_id": Carroceria.objects.create(nome="Sedan").id,
            "custo_aquisicao": "104500.00",
            "observacoes": "Único dono.",
        }

    def send(self, method, path, payload=None):
        corpo = json.dumps(payload) if payload is not None else None
        return getattr(self.client, method)(path, corpo, content_type="application/json")

    def criar_veiculo(self):
        resposta = self.send("post", "/api/veiculos", self.payload)
        self.assertEqual(resposta.status_code, 201, resposta.content)
        return resposta.json()

    def test_veiculo_guarda_custo_observacoes_e_historico_de_entrada(self):
        veiculo = self.criar_veiculo()
        self.assertEqual(veiculo["custo_aquisicao"], 104500.0)
        ficha = self.client.get(f"/api/veiculos/{veiculo['id']}").json()
        self.assertEqual(ficha["observacoes"], "Único dono.")
        self.assertEqual([h["titulo"] for h in ficha["historico"]], ["Entrada no pátio"])
        self.assertIsNone(ficha["sinistro"])

    def test_mudar_status_registra_no_historico(self):
        veiculo = self.criar_veiculo()
        resposta = self.send("patch", f"/api/veiculos/{veiculo['id']}", {"status": "reservado"})
        self.assertEqual(resposta.status_code, 200, resposta.content)
        titulos = [h["titulo"] for h in resposta.json()["historico"]]
        self.assertEqual(titulos, ["Entrada no pátio", "Status alterado para Reservado"])

    def test_opcionais_substituem_a_lista_e_ignoram_repetidos(self):
        veiculo = self.criar_veiculo()
        url = f"/api/veiculos/{veiculo['id']}/opcionais"
        resposta = self.send("put", url, {"nomes": ["Ar-condicionado", " abs ", "ABS", ""]})
        self.assertEqual(resposta.status_code, 200, resposta.content)
        self.assertEqual(sorted(o["nome"] for o in resposta.json()), ["Ar-condicionado", "abs"])
        self.send("put", url, {"nomes": ["Teto solar"]})
        ficha = self.client.get(f"/api/veiculos/{veiculo['id']}").json()
        self.assertEqual([o["nome"] for o in ficha["opcionais"]], ["Teto solar"])

    def test_sinistro_leilao_e_perda_total(self):
        veiculo = self.criar_veiculo()
        url = f"/api/veiculos/{veiculo['id']}/sinistro"
        dados = {"teve_sinistro": True, "de_leilao": True, "perda_total": True, "descricao": "Colisão frontal"}
        resposta = self.send("put", url, dados)
        self.assertEqual(resposta.status_code, 200, resposta.content)
        self.assertEqual(resposta.json(), dados)
        # Segundo PUT atualiza o mesmo registro (um por veículo).
        self.send("put", url, {**dados, "perda_total": False})
        ficha = self.client.get(f"/api/veiculos/{veiculo['id']}").json()
        self.assertFalse(ficha["sinistro"]["perda_total"])
        # Perda total sem sinistro não faz sentido.
        invalido = self.send("put", url, {"teve_sinistro": False, "perda_total": True})
        self.assertEqual(invalido.status_code, 422)

    def test_documentos_crud_e_nome_repetido(self):
        veiculo = self.criar_veiculo()
        base = f"/api/veiculos/{veiculo['id']}/documentos"
        criado = self.send("post", base, {"nome": "CRLV 2026", "situacao": "Em dia", "regular": True})
        self.assertEqual(criado.status_code, 201, criado.content)
        self.assertEqual(self.send("post", base, {"nome": "crlv 2026", "situacao": "Pago"}).status_code, 409)
        doc_id = criado.json()["id"]
        editado = self.send("patch", f"{base}/{doc_id}", {"nome": "CRLV 2026", "situacao": "Pendente", "regular": False})
        self.assertEqual(editado.status_code, 200, editado.content)
        self.assertFalse(editado.json()["regular"])
        self.assertEqual(self.client.delete(f"{base}/{doc_id}").status_code, 204)
        self.assertEqual(self.client.get(f"/api/veiculos/{veiculo['id']}").json()["documentos"], [])

    def test_custos_de_preparacao_e_historico(self):
        veiculo = self.criar_veiculo()
        custo = self.send(
            "post",
            f"/api/veiculos/{veiculo['id']}/custos-preparacao",
            {"nome": "Polimento", "custo": "980.00", "data": "2026-08-05"},
        )
        self.assertEqual(custo.status_code, 201, custo.content)
        self.assertEqual(custo.json()["custo"], 980.0)
        self.assertEqual(
            self.send("post", f"/api/veiculos/{veiculo['id']}/custos-preparacao",
                      {"nome": "X", "custo": "-1", "data": "2026-08-05"}).status_code,
            422,
        )
        evento = self.send("post", f"/api/veiculos/{veiculo['id']}/historico", {"titulo": "2 propostas recebidas", "positivo": True})
        self.assertEqual(evento.status_code, 201, evento.content)
        ficha = self.client.get(f"/api/veiculos/{veiculo['id']}").json()
        self.assertEqual([c["nome"] for c in ficha["custos_preparacao"]], ["Polimento"])
        self.assertEqual(ficha["historico"][-1]["titulo"], "2 propostas recebidas")
        self.assertEqual(self.client.delete(f"/api/veiculos/{veiculo['id']}/custos-preparacao/{custo.json()['id']}").status_code, 204)

    def test_listagem_nao_carrega_dados_da_ficha(self):
        self.criar_veiculo()
        itens = self.client.get("/api/veiculos").json()["items"]
        self.assertEqual(itens[0]["historico"], [])
        self.assertEqual(itens[0]["opcionais"], [])
