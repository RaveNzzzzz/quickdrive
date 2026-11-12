import json

from django.contrib.auth import get_user_model
from django.test import TestCase
from ninja_jwt.tokens import RefreshToken

from employees.models import Cargo, Funcionario, Setor
from financial.models import ContaPagar
from people.models import Pessoa

from .models import CategoriaProduto, Lote, MovimentacaoEstoque, Produto


def criar_funcionario_e_login(client):
    """Usuário logado e vinculado a um funcionário (necessário para lançar compras de lotes)."""
    admin = get_user_model().objects.create_superuser("admin", "admin@example.com", "Senha!2026")
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {RefreshToken.for_user(admin).access_token}"
    cargo = Cargo.objects.create(nome="Vendedor", setor=Setor.objects.create(nome="Comercial"))
    resposta = client.post(
        "/api/funcionarios",
        json.dumps({
            "pessoa": {"nome": "Teste Estoque", "email": "estoque@example.com", "telefone": "11999999999",
                       "cpf_cnpj": "52998224725", "tipo_pessoa": "FISICA", "data_nascimento": None,
                       "endereco": {"rua": "Rua Teste", "numero": "10", "complemento": "", "bairro": "Centro",
                                    "cidade": "São Paulo", "uf": "SP", "cep": "01001000"}},
            "cargo_id": cargo.id, "salario": "2500.50", "comissao": "2.50", "data_admissao": "2026-01-01",
            "inicio_expediente": "08:00", "final_expediente": "17:00", "regime_contratacao": "CLT",
            "banco": "Banco", "agencia": "001", "numero_conta": "123", "tipo_conta": "CORRENTE", "chave_pix": "",
        }),
        content_type="application/json",
    )
    assert resposta.status_code == 201, resposta.content
    admin.funcionario_id = resposta.json()["id"]
    admin.save()
    return admin


class MovimentacaoEstoqueTests(TestCase):
    def setUp(self):
        criar_funcionario_e_login(self.client)
        self.categoria = CategoriaProduto.objects.create(nome="Limpeza")

    def send(self, method, path, payload=None):
        corpo = json.dumps(payload) if payload is not None else None
        return getattr(self.client, method)(path, corpo, content_type="application/json")

    def criar_produto(self, **extra):
        dados = {"nome": "Cera", "categoria_id": self.categoria.id, "valor_unitario": "10.00", **extra}
        return self.send("post", "/api/estoque/produtos", dados)

    def test_produto_com_lote_inicial_lanca_compra_e_movimentacao(self):
        resposta = self.criar_produto(lote={"quantidade": 5, "numero_lote": "L1", "data_validade": "2027-01-31"})
        self.assertEqual(resposta.status_code, 201, resposta.content)
        corpo = resposta.json()
        self.assertEqual(corpo["lote"]["quantidade"], 5)
        self.assertEqual(corpo["lote"]["numero_lote"], "L1")
        conta = ContaPagar.objects.get()
        self.assertEqual(float(conta.valor), 50.0)  # 5 x R$ 10,00
        self.assertEqual(MovimentacaoEstoque.objects.get().tipo, "entrada")

    def test_lote_inicial_sem_valor_nao_cria_o_produto(self):
        resposta = self.criar_produto(valor_unitario=None, lote={"quantidade": 3})
        self.assertEqual(resposta.status_code, 422, resposta.content)
        self.assertEqual(Produto.objects.count(), 0)

    def test_lote_inicial_com_valor_total_informado(self):
        resposta = self.criar_produto(valor_unitario=None, lote={"quantidade": 3, "valor_total": "75.50"})
        self.assertEqual(resposta.status_code, 201, resposta.content)
        self.assertEqual(float(ContaPagar.objects.get().valor), 75.5)
        self.assertTrue(resposta.json()["lote"]["numero_lote"].startswith("ENT-"))

    def test_entrada_manual_usa_valor_total_editado(self):
        produto = self.criar_produto().json()
        calculado = self.send("post", f"/api/estoque/produtos/{produto['id']}/entrada", {"quantidade": 4})
        self.assertEqual(calculado.status_code, 201, calculado.content)
        editado = self.send(
            "post", f"/api/estoque/produtos/{produto['id']}/entrada", {"quantidade": 4, "valor_total": "30.00"}
        )
        self.assertEqual(editado.status_code, 201, editado.content)
        self.assertEqual(sorted(float(c.valor) for c in ContaPagar.objects.all()), [30.0, 40.0])
        self.assertEqual(Lote.objects.filter(produto_id=produto["id"]).count(), 2)  # números automáticos diferentes

    def test_saida_tira_primeiro_do_lote_que_vence_antes(self):
        produto = self.criar_produto().json()
        base = f"/api/estoque/produtos/{produto['id']}"
        self.send("post", f"{base}/entrada", {"quantidade": 3, "numero_lote": "NOVO", "data_validade": "2028-01-01"})
        self.send("post", f"{base}/entrada", {"quantidade": 2, "numero_lote": "VELHO", "data_validade": "2026-12-01"})
        resposta = self.send("post", f"{base}/saida", {"quantidade": 4, "motivo": "Uso na oficina"})
        self.assertEqual(resposta.status_code, 200, resposta.content)
        saldos = {l.numero_lote: l.quantidade for l in Lote.objects.all()}
        self.assertEqual(saldos, {"VELHO": 0, "NOVO": 1})
        self.assertEqual(MovimentacaoEstoque.objects.filter(tipo="saida").count(), 2)

    def test_saida_maior_que_o_estoque_e_recusada(self):
        produto = self.criar_produto(lote={"quantidade": 2}).json()
        resposta = self.send("post", f"/api/estoque/produtos/{produto['id']}/saida", {"quantidade": 3})
        self.assertEqual(resposta.status_code, 409, resposta.content)
        self.assertEqual(Lote.objects.get().quantidade, 2)

    def test_administrador_sem_vinculo_escolhe_o_responsavel_pela_compra(self):
        produto = self.criar_produto().json()
        admin = get_user_model().objects.get(username="admin")
        funcionario_id = admin.funcionario_id
        admin.funcionario_id = None  # administrador sem funcionário vinculado
        admin.save()
        url = f"/api/estoque/produtos/{produto['id']}/entrada"

        sem_responsavel = self.send("post", url, {"quantidade": 2})
        self.assertEqual(sem_responsavel.status_code, 422, sem_responsavel.content)
        self.assertEqual(Lote.objects.count(), 0)

        com_responsavel = self.send("post", url, {"quantidade": 2, "funcionario_id": funcionario_id})
        self.assertEqual(com_responsavel.status_code, 201, com_responsavel.content)
        self.assertEqual(ContaPagar.objects.count(), 1)

        inexistente = self.send("post", url, {"quantidade": 2, "funcionario_id": 99999})
        self.assertEqual(inexistente.status_code, 404, inexistente.content)
