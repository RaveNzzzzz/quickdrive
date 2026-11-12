import json
from datetime import date

from django.test import TestCase

from stock.models import CategoriaProduto, Lote, MovimentacaoEstoque
from stock.tests import criar_funcionario_e_login

from .models import Cambio, Carroceria, Combustivel, Marca, Modelo, Vaga


def _renavam_valido(base10: str) -> str:
    pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma = sum(int(d) * p for d, p in zip(base10, pesos))
    digito = (soma * 10) % 11
    return base10 + str(0 if digito == 10 else digito)


class FichaVeiculoTests(TestCase):
    def setUp(self):
        criar_funcionario_e_login(self.client)
        ano = date.today().year - 1
        self.marca = Marca.objects.create(nome="Subaru")
        self.modelo = Modelo.objects.create(nome="Impreza WRX", marca=self.marca)
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
            "modelo_id": self.modelo.id,
            "placa": "QDA1101",
            "marca_id": self.marca.id,
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

    # --- Procedimentos com produtos do estoque ---

    def criar_produto_com_lote(self, quantidade=10, valor="12.50"):
        categoria = CategoriaProduto.objects.create(nome="Polimento")
        resposta = self.send(
            "post",
            "/api/estoque/produtos",
            {"nome": "Cera", "categoria_id": categoria.id, "valor_unitario": valor, "lote": {"quantidade": quantidade}},
        )
        self.assertEqual(resposta.status_code, 201, resposta.content)
        return resposta.json()

    def test_procedimento_baixa_estoque_e_soma_produtos_ao_custo(self):
        veiculo = self.criar_veiculo()
        produto = self.criar_produto_com_lote(quantidade=10, valor="12.50")
        url = f"/api/veiculos/{veiculo['id']}/custos-preparacao"
        resposta = self.send(
            "post",
            url,
            {
                "nome": "Polimento",
                "custo": "200.00",
                "data": "2026-08-05",
                "produtos": [{"produto_id": produto["id"], "quantidade": 3}],
            },
        )
        self.assertEqual(resposta.status_code, 201, resposta.content)
        custo = resposta.json()
        self.assertEqual(custo["custo"], 237.5)  # 200 de serviço + 3 x 12,50
        self.assertEqual(custo["custo_servico"], 200.0)
        self.assertEqual(custo["produtos"][0]["quantidade"], 3)
        self.assertEqual(custo["produtos"][0]["valor_total"], 37.5)
        self.assertEqual(Lote.objects.get().quantidade, 7)
        ficha = self.client.get(f"/api/veiculos/{veiculo['id']}").json()
        self.assertEqual(ficha["custos_preparacao"][0]["produtos"][0]["nome"], "Cera")

    def test_valor_unitario_do_produto_pode_ser_alterado_no_procedimento(self):
        veiculo = self.criar_veiculo()
        produto = self.criar_produto_com_lote(valor="12.50")
        resposta = self.send(
            "post",
            f"/api/veiculos/{veiculo['id']}/custos-preparacao",
            {"nome": "Lavagem", "custo": "0", "data": "2026-08-05",
             "produtos": [{"produto_id": produto["id"], "quantidade": 2, "valor_unitario": "20.00"}]},
        )
        self.assertEqual(resposta.status_code, 201, resposta.content)
        self.assertEqual(resposta.json()["custo"], 40.0)

    def test_estoque_insuficiente_recusa_e_nao_cria_o_procedimento(self):
        veiculo = self.criar_veiculo()
        produto = self.criar_produto_com_lote(quantidade=2)
        resposta = self.send(
            "post",
            f"/api/veiculos/{veiculo['id']}/custos-preparacao",
            {"nome": "Polimento", "custo": "100", "data": "2026-08-05",
             "produtos": [{"produto_id": produto["id"], "quantidade": 5}]},
        )
        self.assertEqual(resposta.status_code, 409, resposta.content)
        self.assertEqual(Lote.objects.get().quantidade, 2)
        self.assertEqual(self.client.get(f"/api/veiculos/{veiculo['id']}").json()["custos_preparacao"], [])

    def test_excluir_procedimento_devolve_os_produtos_ao_estoque(self):
        veiculo = self.criar_veiculo()
        produto = self.criar_produto_com_lote(quantidade=10)
        criado = self.send(
            "post",
            f"/api/veiculos/{veiculo['id']}/custos-preparacao",
            {"nome": "Polimento", "custo": "100", "data": "2026-08-05",
             "produtos": [{"produto_id": produto["id"], "quantidade": 4}]},
        ).json()
        self.assertEqual(Lote.objects.get().quantidade, 6)
        resposta = self.client.delete(f"/api/veiculos/{veiculo['id']}/custos-preparacao/{criado['id']}")
        self.assertEqual(resposta.status_code, 204)
        self.assertEqual(Lote.objects.get().quantidade, 10)
        self.assertEqual(MovimentacaoEstoque.objects.filter(tipo="entrada").count(), 2)  # lote inicial + devolução

    # --- Modelos e vagas cadastrados ---

    def test_veiculo_usa_o_modelo_cadastrado_e_guarda_o_nome(self):
        veiculo = self.criar_veiculo()
        self.assertEqual(veiculo["modelo"], "Impreza WRX")
        self.assertEqual(veiculo["modelo_id"], self.modelo.id)

    def test_modelo_de_outra_marca_e_recusado(self):
        outra = Marca.objects.create(nome="Fiat")
        modelo_fiat = Modelo.objects.create(nome="Uno", marca=outra)
        resposta = self.send("post", "/api/veiculos", {**self.payload, "modelo_id": modelo_fiat.id})
        self.assertEqual(resposta.status_code, 422, resposta.content)

    def test_trocar_a_marca_exige_um_modelo_da_nova_marca(self):
        veiculo = self.criar_veiculo()
        outra = Marca.objects.create(nome="Fiat")
        invalido = self.send("patch", f"/api/veiculos/{veiculo['id']}", {"marca_id": outra.id})
        self.assertEqual(invalido.status_code, 422, invalido.content)
        uno = Modelo.objects.create(nome="Uno", marca=outra)
        valido = self.send("patch", f"/api/veiculos/{veiculo['id']}", {"marca_id": outra.id, "modelo_id": uno.id})
        self.assertEqual(valido.status_code, 200, valido.content)
        self.assertEqual(valido.json()["modelo"], "Uno")

    def test_crud_de_modelos_filtra_por_marca_e_propaga_o_nome(self):
        veiculo = self.criar_veiculo()
        outra = Marca.objects.create(nome="Fiat")
        self.send("post", "/api/veiculos/opcoes/modelos", {"nome": "Uno", "marca_id": outra.id})
        repetido = self.send("post", "/api/veiculos/opcoes/modelos", {"nome": "uno", "marca_id": outra.id})
        self.assertEqual(repetido.status_code, 409)
        so_subaru = self.client.get(f"/api/veiculos/opcoes/modelos?marca_id={self.marca.id}").json()
        self.assertEqual([m["nome"] for m in so_subaru], ["Impreza WRX"])
        renomeado = self.send("patch", f"/api/veiculos/opcoes/modelos/{self.modelo.id}", {"nome": "WRX STI"})
        self.assertEqual(renomeado.status_code, 200, renomeado.content)
        self.assertEqual(self.client.get(f"/api/veiculos/{veiculo['id']}").json()["modelo"], "WRX STI")
        em_uso = self.client.delete(f"/api/veiculos/opcoes/modelos/{self.modelo.id}")
        self.assertEqual(em_uso.status_code, 409)
        self.assertEqual(self.client.delete(f"/api/veiculos/opcoes/marcas/{self.marca.id}").status_code, 409)

    def test_vaga_com_posicao_e_propagacao_do_nome(self):
        vaga = self.send("post", "/api/veiculos/opcoes/vagas", {"nome": "A-01", "posicao": "Frente da loja"})
        self.assertEqual(vaga.status_code, 201, vaga.content)
        self.assertEqual(self.send("post", "/api/veiculos/opcoes/vagas", {"nome": "a-01"}).status_code, 409)
        veiculo = self.send("post", "/api/veiculos", {**self.payload, "vaga_id": vaga.json()["id"]}).json()
        self.assertEqual(veiculo["vaga"], "A-01")
        self.assertEqual(veiculo["vaga_posicao"], "Frente da loja")
        self.send("patch", f"/api/veiculos/opcoes/vagas/{vaga.json()['id']}", {"nome": "A-02", "posicao": "Destaque"})
        atualizado = self.client.get(f"/api/veiculos/{veiculo['id']}").json()
        self.assertEqual((atualizado["vaga"], atualizado["vaga_posicao"]), ("A-02", "Destaque"))
        self.assertEqual(self.client.delete(f"/api/veiculos/opcoes/vagas/{vaga.json()['id']}").status_code, 409)
        sem_vaga = self.send("patch", f"/api/veiculos/{veiculo['id']}", {"vaga_id": None})
        self.assertEqual(sem_vaga.json()["vaga"], "")
        self.assertEqual(Vaga.objects.count(), 1)

    def test_vaga_nao_pode_ser_ocupada_por_dois_veiculos(self):
        vaga = self.send("post", "/api/veiculos/opcoes/vagas", {"nome": "A-01", "posicao": "Destaque"}).json()
        primeiro = self.send("post", "/api/veiculos", {**self.payload, "vaga_id": vaga["id"]})
        self.assertEqual(primeiro.status_code, 201, primeiro.content)

        segundo_payload = {**self.payload, "chassi": "9BWZZZ377VT004252", "placa": "QDA1102",
                           "renavam": _renavam_valido("1234567891"), "vaga_id": vaga["id"]}
        recusado = self.send("post", "/api/veiculos", segundo_payload)
        self.assertEqual(recusado.status_code, 409, recusado.content)
        self.assertIn("A-01", recusado.json()["detail"])

        # Sem vaga é permitido (a vaga é opcional).
        sem_vaga = self.send("post", "/api/veiculos", {**segundo_payload, "vaga_id": None})
        self.assertEqual(sem_vaga.status_code, 201, sem_vaga.content)
        outro = sem_vaga.json()

        # Mover o segundo para a vaga ocupada também é recusado; o primeiro pode regravar a própria vaga.
        self.assertEqual(self.send("patch", f"/api/veiculos/{outro['id']}", {"vaga_id": vaga["id"]}).status_code, 409)
        regravar = self.send("patch", f"/api/veiculos/{primeiro.json()['id']}", {"vaga_id": vaga["id"], "cor": "Preto"})
        self.assertEqual(regravar.status_code, 200, regravar.content)

        # A listagem de vagas mostra quem ocupa.
        lista = self.client.get("/api/veiculos/opcoes/vagas").json()
        self.assertEqual(lista[0]["ocupada_por_id"], primeiro.json()["id"])
        self.assertIn("QDA1101", lista[0]["ocupada_por"])

    def test_vaga_de_veiculo_vendido_fica_livre(self):
        vaga = self.send("post", "/api/veiculos/opcoes/vagas", {"nome": "B-01"}).json()
        primeiro = self.send("post", "/api/veiculos", {**self.payload, "vaga_id": vaga["id"]}).json()
        self.send("patch", f"/api/veiculos/{primeiro['id']}", {"status": "vendido"})
        self.assertIsNone(self.client.get("/api/veiculos/opcoes/vagas").json()[0]["ocupada_por_id"])

        segundo = {**self.payload, "chassi": "9BWZZZ377VT004252", "placa": "QDA1102",
                   "renavam": _renavam_valido("1234567891"), "vaga_id": vaga["id"]}
        self.assertEqual(self.send("post", "/api/veiculos", segundo).status_code, 201)
        # O vendido não volta para o pátio na vaga que já foi ocupada por outro.
        voltar = self.send("patch", f"/api/veiculos/{primeiro['id']}", {"status": "disponivel"})
        self.assertEqual(voltar.status_code, 409, voltar.content)
