import json
from datetime import date, time

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from ninja_jwt.tokens import RefreshToken

from employees.models import Cargo, Desligamento, Funcionario, Setor
from people.models import Pessoa

User = get_user_model()


class DesligamentoAcessoTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        setor = Setor.objects.create(nome="Comercial")
        cargo = Cargo.objects.create(nome="Vendedor", setor=setor)
        pessoa = Pessoa.objects.create(nome="Funcionário de teste", email="funcionario@example.com",
            telefone="11999999999", cpf_cnpj="52998224725", tipo_pessoa="fisica")
        cls.funcionario = Funcionario.objects.create(pessoa=pessoa, cargo=cargo, salario=1000,
            data_admissao=date(2026, 1, 1), inicio_expediente=time(8), final_expediente=time(17),
            regime_contratacao="clt", banco="Banco", agencia="1", numero_conta="1", tipo_conta="corrente")
        cls.user = User.objects.create_user("funcionario", pessoa.email, "Senha-forte!2026", funcionario=cls.funcionario)
        cls.admin = User.objects.create_superuser("admin", "admin@example.com", "Senha-forte!2026")

    def setUp(self):
        self.refresh = RefreshToken.for_user(self.user)
        self.access = str(self.refresh.access_token)

    def request_as(self, user):
        self.client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {RefreshToken.for_user(user).access_token}"

    def post(self, path, data):
        return self.client.post(path, json.dumps(data), content_type="application/json")

    def offboard(self):
        Desligamento.objects.create(funcionario=self.funcionario,
            data_desligamento=date(2026, 10, 8), motivo="Fim do contrato")

    def test_ativo_pode_logar_e_renovar(self):
        self.assertEqual(self.post('/api/token/pair', {"username": self.user.username, "password": "Senha-forte!2026"}).status_code, 200)
        self.assertEqual(self.post('/api/token/refresh', {"refresh": str(self.refresh)}).status_code, 200)

    def test_desligamento_desativa_conta_e_bloqueia_login(self):
        self.offboard()
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertEqual(self.post('/api/token/pair', {"username": self.user.username, "password": "Senha-forte!2026"}).status_code, 401)
        self.assertFalse(self.client.login(username=self.user.username, password="Senha-forte!2026"))

    def test_tokens_emitidos_antes_nao_acessam_nenhum_router(self):
        self.offboard()
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {self.access}'
        for path in ['/api/contas/me', '/api/funcionarios', '/api/cargos', '/api/setores',
                     '/api/clientes', '/api/veiculos', '/api/estoque/produtos', '/api/documentos/tipos']:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 401)
        self.assertEqual(self.post('/api/token/refresh', {"refresh": str(self.refresh)}).status_code, 401)
        self.assertEqual(self.post('/api/token/verify', {"token": self.access}).status_code, 401)

    def test_conta_reativada_manualmente_nao_contorna_desligamento(self):
        self.offboard()
        User.objects.filter(pk=self.user.pk).update(is_active=True)
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {self.access}'
        self.assertEqual(self.client.get('/api/contas/me').status_code, 401)
        self.assertEqual(self.post('/api/token/refresh', {"refresh": str(self.refresh)}).status_code, 401)

    def test_inatividade_do_funcionario_sem_desligamento_tambem_bloqueia(self):
        Funcionario.objects.filter(pk=self.funcionario.pk).update(ativo=False)
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {self.access}'
        self.assertEqual(self.client.get('/api/contas/me').status_code, 401)
        self.assertEqual(self.post('/api/token/pair', {"username": self.user.username, "password": "Senha-forte!2026"}).status_code, 401)
        self.assertEqual(self.post('/api/token/refresh', {"refresh": str(self.refresh)}).status_code, 401)

    def test_superusuario_sem_funcionario_permanece_funcional(self):
        self.offboard()
        self.request_as(self.admin)
        self.assertEqual(self.client.get('/api/contas/me').status_code, 200)
        self.assertTrue(self.client.login(username='admin', password='Senha-forte!2026'))

    def test_vinculo_unico(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user('duplicado', 'duplicado@example.com', 'Senha!2026', funcionario=self.funcionario)

    def test_rollback_do_desligamento_preserva_conta_e_funcionario(self):
        try:
            with transaction.atomic():
                self.offboard()
                raise RuntimeError('Falha de teste')
        except RuntimeError:
            pass
        self.user.refresh_from_db()
        self.funcionario.refresh_from_db()
        self.assertTrue(self.user.is_active)
        self.assertTrue(self.funcionario.ativo)
        self.assertFalse(Desligamento.objects.exists())

    def test_endpoint_desligamento_retorna_funcionario_e_desativa_conta(self):
        self.request_as(self.admin)
        response = self.post(f'/api/funcionarios/{self.funcionario.pk}/desligar', {
            "data_desligamento": "2026-10-08", "motivo": "Fim do contrato",
        })
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(response.json()['ativo'])
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_cadastro_publico_removido(self):
        response = self.post('/api/contas/signup', {"username": "intruso", "password": "Senha!2026", "email": "intruso@example.com"})
        self.assertEqual(response.status_code, 404)

    def test_perfil_retorna_dados_do_funcionario_da_conta(self):
        from people.models import Endereco
        Endereco.objects.create(pessoa=self.funcionario.pessoa, rua='Rua Teste', numero='10',
            bairro='Centro', cidade='São Paulo', uf='SP', cep='01001000')
        self.request_as(self.user)
        response = self.client.get('/api/contas/me')
        self.assertEqual(response.status_code, 200, response.content)
        profile = response.json()['funcionario']
        self.assertEqual(profile['id'], self.funcionario.id)
        self.assertEqual(profile['pessoa']['nome'], self.funcionario.pessoa.nome)
        self.assertEqual(profile['pessoa']['endereco']['cep'], '01001000')
        self.assertEqual(profile['cargo']['setor']['nome'], 'Comercial')
        self.assertNotIn('salario', profile)
        self.assertNotIn('numero_conta', profile)
        Pessoa.objects.filter(pk=self.funcionario.pessoa_id).update(nome='Nome atualizado')
        self.assertEqual(self.client.get('/api/contas/me').json()['funcionario']['pessoa']['nome'], 'Nome atualizado')

    def test_perfil_sem_vinculo_preserva_superusuario(self):
        self.request_as(self.admin)
        response = self.client.get('/api/contas/me')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIsNone(response.json()['funcionario'])
        self.assertEqual(response.json()['username'], self.admin.username)

    def test_perfil_sem_endereco_e_requisicao_anonima(self):
        self.request_as(self.user)
        response = self.client.get('/api/contas/me')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIsNone(response.json()['funcionario']['pessoa']['endereco'])
        self.client.defaults.pop('HTTP_AUTHORIZATION')
        self.assertEqual(self.client.get('/api/contas/me').status_code, 401)

    def test_cargo_comum_bloqueia_gestao_mas_permite_perfil(self):
        self.request_as(self.user)
        for path in ['/api/funcionarios', '/api/cargos', '/api/setores', '/api/documentos/funcionarios']:
            self.assertEqual(self.client.get(path).status_code, 403, path)
        response = self.client.get('/api/contas/me')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()['pode_gerenciar'])
        self.assertEqual(self.post('/api/cargos', {'nome': 'Administrador', 'setor_id': self.funcionario.cargo.setor_id, 'papel_acesso': 'ADMINISTRADOR'}).status_code, 403)

    def test_cargo_gestor_e_superusuario_acessam_e_revogacao_e_imediata(self):
        self.request_as(self.user)
        for role in ['GERENTE', 'ADMINISTRADOR']:
            Cargo.objects.filter(pk=self.funcionario.cargo_id).update(papel_acesso=role)
            for path in ['/api/funcionarios', '/api/cargos', '/api/setores']:
                self.assertEqual(self.client.get(path).status_code, 200)
            self.assertTrue(self.client.get('/api/contas/me').json()['pode_gerenciar'])
        Cargo.objects.filter(pk=self.funcionario.cargo_id).update(papel_acesso='COMUM')
        self.assertEqual(self.client.get('/api/funcionarios').status_code, 403)
        self.request_as(self.admin)
        self.assertEqual(self.client.get('/api/funcionarios').status_code, 200)
        self.assertTrue(self.client.get('/api/contas/me').json()['pode_gerenciar'])

    def test_troca_senha_altera_somente_conta_autenticada_e_login(self):
        self.request_as(self.user)
        original_admin = self.admin.password
        response = self.post('/api/contas/senha', {'nova_senha': 'Outra-Senha!2026', 'confirmacao': 'Outra-Senha!2026'})
        self.assertEqual(response.status_code, 204, response.content)
        self.user.refresh_from_db()
        self.admin.refresh_from_db()
        self.assertTrue(self.user.check_password('Outra-Senha!2026'))
        self.assertNotEqual(self.user.password, 'Outra-Senha!2026')
        self.assertEqual(self.admin.password, original_admin)
        self.assertEqual(self.post('/api/token/pair', {'username': self.user.username, 'password': 'Senha-forte!2026'}).status_code, 401)
        self.assertEqual(self.post('/api/token/pair', {'username': self.user.username, 'password': 'Outra-Senha!2026'}).status_code, 200)

    def test_troca_senha_invalida_nao_altera_hash(self):
        self.request_as(self.user)
        original = self.user.password
        for password, confirmation in [('Outra-Senha!2026', 'Diferente!2026'), ('12345678', '12345678'), ('curta', 'curta')]:
            response = self.post('/api/contas/senha', {'nova_senha': password, 'confirmacao': confirmation})
            self.assertEqual(response.status_code, 422, response.content)
            self.user.refresh_from_db()
            self.assertEqual(self.user.password, original)

    def test_troca_senha_exige_conta_ativa_autenticada(self):
        payload = {'nova_senha': 'Outra-Senha!2026', 'confirmacao': 'Outra-Senha!2026'}
        self.assertEqual(self.post('/api/contas/senha', payload).status_code, 401)
        self.request_as(self.user)
        self.offboard()
        self.assertEqual(self.post('/api/contas/senha', payload).status_code, 401)
