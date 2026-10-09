import json

from django.contrib.auth import get_user_model
from django.test import TestCase
from ninja_jwt.tokens import RefreshToken

from employees.models import Cargo, Funcionario, Setor
from people.models import Pessoa


class FuncionarioIntegracaoTests(TestCase):
    def setUp(self):
        admin = get_user_model().objects.create_superuser('admin', 'admin@example.com', 'Senha!2026')
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {RefreshToken.for_user(admin).access_token}'
        cargo = Cargo.objects.create(nome='Vendedor', setor=Setor.objects.create(nome='Comercial'))
        self.payload = {
            'pessoa': {'nome': 'Teste Integração', 'email': 'teste@example.com',
                'telefone': '11999999999', 'cpf_cnpj': '52998224725', 'tipo_pessoa': 'FISICA',
                'data_nascimento': None, 'endereco': {'rua': 'Rua Teste', 'numero': '10',
                    'complemento': '', 'bairro': 'Centro', 'cidade': 'São Paulo', 'uf': 'SP', 'cep': '01001000'}},
            'cargo_id': cargo.id, 'salario': '2500.50', 'comissao': '2.50',
            'data_admissao': '2026-01-01', 'inicio_expediente': '08:00', 'final_expediente': '17:00',
            'regime_contratacao': 'CLT', 'banco': 'Banco', 'agencia': '001',
            'numero_conta': '123', 'tipo_conta': 'CORRENTE', 'chave_pix': '',
        }

    def send(self, method, path, payload):
        return getattr(self.client, method)(path, json.dumps(payload), content_type='application/json')

    def test_cadastro_edicao_listagem_e_desligamento(self):
        response = self.send('post', '/api/funcionarios', self.payload)
        self.assertEqual(response.status_code, 201, response.content)
        employee = response.json()
        self.assertEqual(employee['pessoa']['endereco']['cep'], '01001000')
        self.assertEqual(employee['cargo']['setor']['nome'], 'Comercial')
        employee_id = employee['id']
        response = self.send('patch', f'/api/funcionarios/{employee_id}', {
            'salario': '3000.75', 'pessoa': {'nome': 'Nome atualizado', 'endereco': {'numero': '20'}}})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['pessoa']['endereco']['numero'], '20')
        self.assertEqual(self.client.get('/api/funcionarios?ativo=true&limit=100&offset=0').json()['count'], 1)
        response = self.send('post', f'/api/funcionarios/{employee_id}/desligar', {
            'data_desligamento': '2026-10-08', 'motivo': 'Fim do contrato', 'observacoes': ''})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(response.json()['ativo'])
        self.assertEqual(response.json()['desligamento']['motivo'], 'Fim do contrato')
        self.assertEqual(self.client.get('/api/funcionarios?ativo=true').json()['count'], 0)
        self.assertEqual(self.client.get('/api/funcionarios?ativo=false').json()['count'], 1)
        self.assertEqual(self.send('patch', f'/api/funcionarios/{employee_id}', {'salario': '1'}).status_code, 422)

    def test_cadastro_invalido_reverte_pessoa_e_endereco(self):
        self.payload['comissao'] = '101'
        response = self.send('post', '/api/funcionarios', self.payload)
        self.assertEqual(response.status_code, 422, response.content)
        self.assertEqual(Funcionario.objects.count(), 0)
        self.assertEqual(Pessoa.objects.count(), 0)

    def test_cpf_sem_digitos_verificadores_validos_pode_ser_cadastrado_e_editado(self):
        self.payload['pessoa']['cpf_cnpj'] = '12345678901'
        response = self.send('post', '/api/funcionarios', self.payload)
        self.assertEqual(response.status_code, 201, response.content)
        employee_id = response.json()['id']
        response = self.send('patch', f'/api/funcionarios/{employee_id}', {
            'pessoa': {'cpf_cnpj': '11111111111'}})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['pessoa']['cpf_cnpj'], '11111111111')

    def test_cpf_precisa_ter_onze_digitos(self):
        self.payload['pessoa']['cpf_cnpj'] = '12345678901234'
        response = self.send('post', '/api/funcionarios', self.payload)
        self.assertEqual(response.status_code, 422, response.content)
        self.assertEqual(Funcionario.objects.count(), 0)
