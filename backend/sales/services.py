"""Regras de negócio compartilhadas entre vendas e o funil (usadas pelas rotas e pelo comando dados_teste)."""
from django.utils import timezone

from customers.models import Cliente
from vehicles.enums import StatusVeiculo
from vehicles.models import Veiculo

from .enums import EtapaNegociacao, StatusVenda
from .models import Negociacao, NegociacaoEvento, Venda

ETAPAS_ABERTAS = (
    EtapaNegociacao.INTERESSE,
    EtapaNegociacao.TEST_DRIVE,
    EtapaNegociacao.NEGOCIACAO,
    EtapaNegociacao.CREDITO,
)
# Nestas etapas o carro fica "reservado" no pátio, para ninguém vendê-lo para outra pessoa sem saber.
ETAPAS_QUE_RESERVAM = (EtapaNegociacao.NEGOCIACAO, EtapaNegociacao.CREDITO)
STATUS_DE_OFICINA = (StatusVeiculo.MANUTENCAO, StatusVeiculo.PREPARACAO)


def sincronizar_veiculo(veiculo_id: int | None):
    """Acerta o status do veículo depois de mexer em vendas ou negociações.

    Venda ativa -> vendido. Negociação em Negociação/Crédito -> reservado. Sem nenhum dos dois,
    um carro vendido ou reservado volta a ficar disponível. Manutenção e preparação só mudam por venda.
    """
    if veiculo_id is None:
        return
    veiculo = Veiculo.objects.filter(id=veiculo_id).first()
    if veiculo is None:
        return
    if Venda.objects.filter(veiculo_id=veiculo_id).exclude(status=StatusVenda.CANCELADA).exists():
        novo = StatusVeiculo.VENDIDO
    elif veiculo.status in STATUS_DE_OFICINA:
        return
    elif Negociacao.objects.filter(veiculo_id=veiculo_id, etapa__in=ETAPAS_QUE_RESERVAM).exists():
        novo = StatusVeiculo.RESERVADO
    elif veiculo.status in (StatusVeiculo.VENDIDO, StatusVeiculo.RESERVADO):
        novo = StatusVeiculo.DISPONIVEL
    else:
        return
    if veiculo.status != novo:
        Veiculo.objects.filter(id=veiculo_id).update(status=novo)


def mudar_etapa(negociacao: Negociacao, etapa: str, funcionario_id: int | None):
    """Troca a etapa, zera o relógio de "dias na etapa" e grava no histórico. Não chama save()."""
    anterior = negociacao.etapa
    negociacao.etapa = etapa
    negociacao.etapa_desde = timezone.now()
    if etapa != EtapaNegociacao.PERDIDO:
        negociacao.motivo_perda = ""
    NegociacaoEvento.objects.create(
        negociacao=negociacao, etapa_anterior=anterior, etapa_nova=etapa, funcionario_id=funcionario_id
    )


def reabrir_negociacao_da_venda(venda_id: int, funcionario_id: int | None):
    """Venda cancelada ou excluída: a negociação que a gerou volta para "Negociação"."""
    negociacao = Negociacao.objects.filter(venda_id=venda_id).first()
    if negociacao is None:
        return
    negociacao.venda = None
    mudar_etapa(negociacao, EtapaNegociacao.NEGOCIACAO, funcionario_id)
    negociacao.save()


def registrar_interacao(cliente_id: int | None):
    """Atualiza a "última interação" do cliente (aparece na tela de Clientes)."""
    if cliente_id is not None:
        Cliente.objects.filter(id=cliente_id).update(ultima_interacao=timezone.now())
