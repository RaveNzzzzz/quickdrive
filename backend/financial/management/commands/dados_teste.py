"""Cria (ou apaga) dados de teste para as telas de Vendas e Financeiro.

    python manage.py dados_teste           # apaga os dados de teste antigos e cria de novo
    python manage.py dados_teste --limpar  # só apaga

Tudo que este comando cria tem "[TESTE]" no nome/descrição (ou chassi começando com
9BWTESTE, ou e-mail @teste.quickdrive), e o --limpar apaga só isso.
"""
from datetime import date, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from customers.models import Cliente
from employees.models import Cargo, Funcionario, Setor
from financial.models import ContaPagar, ContaReceber, Despesa, Receita
from people.models import Endereco, Pessoa
from sales.models import Compra, Negociacao, NegociacaoEvento, Venda
from sales.services import sincronizar_veiculo
from stock.models import CategoriaProduto, Lote, Produto
from vehicles.enums import StatusVeiculo
from vehicles.models import Cambio, Carroceria, Combustivel, Marca, Veiculo

TAG = "[TESTE]"
EMAIL = "@teste.quickdrive"
CHASSI = "9BWTESTE"

CLIENTES = ["Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Ramos"]
VENDEDORES = ["Rafael Borges", "Júlia Lopes"]

# modelo, cor, valor, (dias atrás, status, forma de pagamento) da venda ou None se não foi vendido
VEICULOS = [
    ("Gol", "Prata", 52000, (3, "pago", "pix")),
    ("Polo", "Branco", 89000, (12, "pendente", "financiamento")),
    ("T-Cross", "Cinza", 128000, (25, "pago", "financiamento")),
    ("Virtus", "Preto", 99000, (40, "pago", "consorcio")),
    ("Nivus", "Azul", 115000, (50, "pago", "transferencia")),
    ("Saveiro", "Vermelho", 78000, (8, "cancelada", "boleto")),
    ("Jetta", "Branco", 165000, (70, "pago", "financiamento")),
    ("Amarok", "Preto", 240000, None),
    ("Taos", "Cinza", 189000, None),
    ("Fox", "Prata", 45000, None),
]

# Funil: nome, telefone, etapa, dias na etapa, origem, modelo do veículo, valor da proposta,
# próximo passo, próximo contato (dias a partir de hoje) e motivo da perda.
NEGOCIACOES = [
    ("Fernanda Rocha", "11988887777", "interesse", 1, "instagram", "Taos", None, "Enviar fotos do Taos", 0, ""),
    ("Gustavo Pires", "11977776666", "interesse", 10, "olx", "Fox", None, "Ligar de novo", -3, ""),
    ("Helena Duarte", "11966665555", "test_drive", 2, "site", "Taos", 185000, "Test drive sábado 10h", 2, ""),
    ("Igor Matos", "", "negociacao", 4, "indicacao", "Amarok", 235000, "Contraproposta R$ 230 mil", 1, ""),
    ("Joana Freitas", "11955554444", "credito", 6, "loja", "Saveiro", 76000, "Aguardando o banco", -1, ""),
    ("Lucas Prado", "11944443333", "perdido", 12, "webmotors", "Fox", 43000, "", None, "preco"),
]

# descrição, categoria, valor, [(dias a partir de hoje, pago?)]
DESPESAS = [
    ("Aluguel do pátio", "Aluguel", 5000, [(-25, True), (5, False)]),
    ("Energia elétrica", "Contas de consumo", 980, [(-12, True), (0, False)]),
    ("Água", "Contas de consumo", 310, [(-4, False)]),
    ("Anúncios em redes sociais", "Marketing", 1200, [(-15, True), (10, False)]),
    ("Lavagem e estética", "Manutenção", 650, [(-2, False), (12, False)]),
    ("Folha de pagamento", "Pessoal", 18500, [(-27, True), (3, False)]),
]


def _renavam(base: int) -> str:
    """Monta um RENAVAM de 11 dígitos com o dígito verificador certo."""
    digitos = f"{base:010d}"
    pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma = sum(int(d) * p for d, p in zip(digitos, pesos))
    dv = (soma * 10) % 11
    return digitos + str(0 if dv == 10 else dv)


def _pessoa(nome: str, indice: int) -> Pessoa:
    slug = nome.split()[0].lower()
    pessoa = Pessoa.objects.create(
        nome=f"{TAG} {nome}",
        email=f"{slug}{indice}{EMAIL}",
        telefone=f"1199999{indice:04d}",
        cpf_cnpj=f"9990000{indice:04d}",
    )
    Endereco.objects.create(
        pessoa=pessoa, rua="Rua de Teste", numero=str(indice), bairro="Centro",
        cidade="São Paulo", uf="SP", cep="01001000",
    )
    return pessoa


def _opcao(modelo, nome: str):
    # Usa uma opção já cadastrada pelo grupo; só cria uma [TESTE] se a tabela estiver vazia.
    return modelo.objects.order_by("id").first() or modelo.objects.create(nome=f"{TAG} {nome}")


class Command(BaseCommand):
    help = "Cria dados de teste ([TESTE]) para vendas, compras e financeiro. Use --limpar para só apagar."

    def add_arguments(self, parser):
        parser.add_argument("--limpar", action="store_true", help="Só apaga os dados de teste.")

    @transaction.atomic
    def handle(self, *args, **options):
        self.limpar()
        if options["limpar"]:
            self.stdout.write(self.style.SUCCESS("Dados de teste apagados."))
            return
        self.criar()

    def limpar(self):
        # A ordem importa: primeiro quem aponta para os outros (as FKs são PROTECT).
        Negociacao.objects.filter(funcionario__pessoa__email__endswith=EMAIL).delete()  # o histórico vai junto
        ContaReceber.objects.filter(receita__descricao__startswith=TAG).delete()
        ContaPagar.objects.filter(despesa__descricao__startswith=TAG).delete()
        Receita.objects.filter(descricao__startswith=TAG).delete()
        Despesa.objects.filter(descricao__startswith=TAG).delete()
        Venda.objects.filter(veiculo__chassi__startswith=CHASSI).delete()
        Compra.objects.filter(funcionario__pessoa__email__endswith=EMAIL).delete()
        Veiculo.objects.filter(chassi__startswith=CHASSI).delete()
        Lote.objects.filter(produto__nome__startswith=TAG).delete()
        Produto.objects.filter(nome__startswith=TAG).delete()
        CategoriaProduto.objects.filter(nome__startswith=TAG).delete()
        Funcionario.objects.filter(pessoa__email__endswith=EMAIL).delete()
        Cargo.objects.filter(nome__startswith=TAG).delete()
        Setor.objects.filter(nome__startswith=TAG).delete()
        Cliente.objects.filter(pessoa__email__endswith=EMAIL).delete()
        Pessoa.objects.filter(email__endswith=EMAIL).delete()  # o endereço vai junto (CASCADE)
        for modelo in (Marca, Cambio, Combustivel, Carroceria):
            modelo.objects.filter(nome__startswith=TAG).delete()

    def criar(self):
        hoje = timezone.localdate()

        def dia(offset: int) -> date:
            return hoje + timedelta(days=offset)

        clientes = [Cliente.objects.create(pessoa=_pessoa(nome, i)) for i, nome in enumerate(CLIENTES, start=1)]

        setor = Setor.objects.create(nome=f"{TAG} Vendas")
        cargo = Cargo.objects.create(nome=f"{TAG} Vendedor", setor=setor)
        vendedores = [
            Funcionario.objects.create(
                pessoa=_pessoa(nome, 50 + i), cargo=cargo, salario=Decimal(3500), comissao=Decimal(2),
                data_admissao=dia(-400), inicio_expediente=time(8), final_expediente=time(17),
                regime_contratacao="CLT", banco="Banco de Teste", agencia="0001",
                numero_conta=f"1234{i}", tipo_conta="CORRENTE",
            )
            for i, nome in enumerate(VENDEDORES)
        ]

        marca = _opcao(Marca, "Volkswagen")
        cambio = _opcao(Cambio, "Manual")
        combustivel = _opcao(Combustivel, "Flex")
        carroceria = _opcao(Carroceria, "Hatch")

        receita_vendas = []
        for i, (modelo, cor, valor, venda) in enumerate(VEICULOS, start=1):
            vendido = venda is not None and venda[1] != "cancelada"
            veiculo = Veiculo.objects.create(
                ano_modelo=hoje.year, ano_fabricacao=date(hoje.year - 1, 6, 1), portas=4,
                quilometragem=1000 * i, lugares=5, chassi=f"{CHASSI}{i:09d}", versao=TAG, cor=cor,
                porta_malas=300, motorizacao="1.0 TSI", renavam=_renavam(900000000 + i),
                valor=Decimal(valor), modelo=modelo, placa=f"TST{i}A{i:02d}",
                status=StatusVeiculo.VENDIDO if vendido else StatusVeiculo.DISPONIVEL,
                marca=marca, cambio=cambio, combustivel=combustivel, carroceria=carroceria,
            )
            if venda is None:
                continue
            dias_atras, status, forma = venda
            cliente = clientes[i % len(clientes)]
            nova = Venda.objects.create(
                veiculo=veiculo, cliente=cliente, funcionario=vendedores[i % len(vendedores)],
                valor_venda=Decimal(valor), forma_pagamento=forma, status=status, data_venda=dia(-dias_atras),
            )
            if status != "cancelada":
                receita_vendas.append((nova, cliente, dias_atras))

        # Cada venda ativa vira uma receita, paga em 1 ou 3 parcelas.
        for venda, cliente, dias_atras in receita_vendas:
            receita = Receita.objects.create(
                descricao=f"{TAG} Venda {venda.veiculo.modelo} ({venda.veiculo.placa})",
                categoria=venda.get_forma_pagamento_display(),
                valor=venda.valor_venda, data=venda.data_venda,
            )
            parcelas = 3 if venda.forma_pagamento == "financiamento" else 1
            for n in range(parcelas):
                vencimento = dia(-dias_atras + 30 * n)
                recebida = venda.status == "pago" and vencimento < hoje
                ContaReceber.objects.create(
                    receita=receita, venda=venda,
                    descricao=f"{cliente.pessoa.nome.removeprefix(TAG).strip()} · parcela {n + 1}/{parcelas}",
                    valor=(venda.valor_venda / parcelas).quantize(Decimal("0.01")),
                    data_vencimento=vencimento,
                    data_recebimento=vencimento if recebida else None,
                    status="recebido" if recebida else "pendente",
                )

        for descricao, categoria, valor, contas in DESPESAS:
            despesa = Despesa.objects.create(
                descricao=f"{TAG} {descricao}", categoria=categoria, valor=Decimal(valor), data=dia(contas[0][0]),
            )
            for offset, pago in contas:
                ContaPagar.objects.create(
                    despesa=despesa, descricao=descricao, valor=Decimal(valor), data_vencimento=dia(offset),
                    data_pagamento=dia(offset) if pago else None, status="pago" if pago else "pendente",
                )

        # Compras: o Amarok comprado de um cliente e um lote de óleo para o estoque.
        amarok = Veiculo.objects.get(chassi__startswith=CHASSI, modelo="Amarok")
        compra_veiculo = Compra.objects.create(
            funcionario=vendedores[0], cliente=clientes[0], item_compra="veiculo", veiculo=amarok,
            valor_compra=Decimal(205000), forma_pagamento="transferencia", status="concluida", data_compra=dia(-20),
        )
        categoria = CategoriaProduto.objects.create(nome=f"{TAG} Fluidos")
        produto = Produto.objects.create(nome=f"{TAG} Óleo 5W30", categoria=categoria)
        lote = Lote.objects.create(produto=produto, numero_lote="TESTE-001", quantidade=24, data_validade=dia(365))
        compra_lote = Compra.objects.create(
            funcionario=vendedores[1], item_compra="produto", lote=lote,
            valor_compra=Decimal(840), forma_pagamento="boleto", status="pendente", data_compra=dia(-6),
        )
        despesa_compras = Despesa.objects.create(
            descricao=f"{TAG} Compras de estoque e veículos", categoria="Compras", valor=Decimal(205840), data=dia(-20),
        )
        ContaPagar.objects.create(
            despesa=despesa_compras, compra=compra_veiculo, descricao="Compra Amarok", valor=Decimal(205000),
            data_vencimento=dia(-20), data_pagamento=dia(-20), status="pago",
        )
        ContaPagar.objects.create(
            despesa=despesa_compras, compra=compra_lote, descricao="Óleo 5W30 (24 un.)", valor=Decimal(840),
            data_vencimento=dia(8), status="pendente",
        )

        # Funil: negociações em todas as etapas. As vendidas apontam para as vendas pagas mais recentes.
        agora = timezone.now()
        veiculos = {v.modelo: v for v in Veiculo.objects.filter(chassi__startswith=CHASSI)}
        ordem_por_etapa: dict[str, int] = {}

        def negociacao(etapa: str, dias: int, **campos) -> Negociacao:
            ordem_por_etapa[etapa] = ordem_por_etapa.get(etapa, -1) + 1
            nova = Negociacao.objects.create(
                etapa=etapa, etapa_desde=agora - timedelta(days=dias), ordem=ordem_por_etapa[etapa], **campos
            )
            NegociacaoEvento.objects.create(negociacao=nova, etapa_nova=etapa, funcionario=nova.funcionario)
            return nova

        for i, (nome, telefone, etapa, dias, origem, modelo, valor, passo, contato, motivo) in enumerate(NEGOCIACOES):
            negociacao(
                etapa, dias, nome_interessado=f"{TAG} {nome}", telefone=telefone, origem=origem,
                veiculo=veiculos[modelo], funcionario=vendedores[i % len(vendedores)],
                valor_proposta=Decimal(valor) if valor else None, proximo_passo=passo,
                proximo_contato=dia(contato) if contato is not None else None, motivo_perda=motivo,
            )
        # Um cliente já cadastrado voltando para comprar outro carro (aparece "Em negociação" na tela de Clientes).
        negociacao(
            "test_drive", 3, nome_interessado=clientes[0].pessoa.nome, cliente=clientes[0], telefone=clientes[0].pessoa.telefone,
            veiculo=veiculos["Fox"], funcionario=vendedores[0], origem="indicacao",
            proximo_passo="Retorno sobre o test drive", proximo_contato=dia(1),
        )
        pagas = Venda.objects.filter(veiculo__chassi__startswith=CHASSI, status="pago").order_by("-data_venda")[:2]
        for venda in pagas:
            negociacao(
                "vendido", (hoje - venda.data_venda).days, nome_interessado=venda.cliente.pessoa.nome,
                cliente=venda.cliente, veiculo=venda.veiculo, funcionario=venda.funcionario, venda=venda,
                valor_proposta=venda.valor_venda, origem="loja",
            )
        for veiculo in veiculos.values():
            sincronizar_veiculo(veiculo.id)  # Amarok e Saveiro ficam "reservados" (Negociação/Crédito)

        self.stdout.write(self.style.SUCCESS(
            f"Criados: {Negociacao.objects.filter(funcionario__pessoa__email__endswith=EMAIL).count()} negociações, "
            f"{Venda.objects.filter(veiculo__chassi__startswith=CHASSI).count()} vendas, "
            f"{Compra.objects.filter(funcionario__pessoa__email__endswith=EMAIL).count()} compras, "
            f"{ContaReceber.objects.filter(receita__descricao__startswith=TAG).count()} contas a receber e "
            f"{ContaPagar.objects.filter(despesa__descricao__startswith=TAG).count()} contas a pagar."
        ))
