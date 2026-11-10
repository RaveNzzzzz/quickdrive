from django.core.exceptions import ValidationError
from django.db.models import Q
from django.utils import timezone
from ninja.errors import HttpError

from financial.enums import StatusContaPagar
from financial.models import ContaPagar, Despesa
from stock.models import Lote

from .enums import ItemCompra, StatusCompra
from .models import Compra


def conferir_lote_disponivel(compra):
    if compra.item_compra != ItemCompra.PRODUTO or compra.status == StatusCompra.CANCELADA:
        return
    if not Lote.objects.select_for_update().filter(pk=compra.lote_id).first():
        raise HttpError(404, "Lote não encontrado.")
    if Compra.objects.filter(lote_id=compra.lote_id).exclude(
        Q(pk=compra.pk) | Q(status=StatusCompra.CANCELADA)
    ).exists():
        raise HttpError(409, "Já existe uma compra ativa para este lote.")


def gerar_conta_do_lote(compra, vencimento=None):
    if compra.item_compra != ItemCompra.PRODUTO or compra.status == StatusCompra.CANCELADA:
        return
    descricao = f"Compra #{compra.pk} — {compra.lote.produto.nome} (lote {compra.lote.numero_lote})"[:200]
    despesa = Despesa.objects.create(
        descricao=descricao, categoria="Estoque", valor=compra.valor_compra, data=compra.data_compra
    )
    ContaPagar.objects.create(
        compra=compra, despesa=despesa, gerada_por_compra=True,
        descricao=descricao, valor=compra.valor_compra,
        data_vencimento=vencimento or compra.data_compra,
    )


def registrar_compra_do_novo_lote(lote, funcionario_id):
    valor_unitario = lote.produto.valor_unitario
    if valor_unitario is None or valor_unitario <= 0:
        raise HttpError(422, "Informe um valor unitário maior que zero no produto antes de cadastrar o lote.")

    compra = Compra(
        funcionario_id=funcionario_id,
        lote=lote,
        item_compra=ItemCompra.PRODUTO,
        valor_compra=valor_unitario * lote.quantidade,
        data_compra=timezone.localdate(),
        status=StatusCompra.CONCLUIDA,
    )
    try:
        Compra._meta.get_field("valor_compra").clean(compra.valor_compra, compra)
    except ValidationError:
        raise HttpError(422, "O valor total do lote excede o limite de uma compra.")
    compra.save()
    gerar_conta_do_lote(compra)


def sincronizar_conta_do_lote(compra, anterior):
    conta = ContaPagar.objects.select_for_update().filter(
        compra=compra, gerada_por_compra=True
    ).first()
    if conta is None:
        if (
            anterior.status == StatusCompra.CANCELADA
            or anterior.item_compra != ItemCompra.PRODUTO
        ) and not compra.contas_pagar.exists():
            gerar_conta_do_lote(compra)
        return

    if (compra.item_compra, compra.lote_id) != (anterior.item_compra, anterior.lote_id):
        raise HttpError(409, "Não é possível trocar o lote de uma compra com conta a pagar.")

    cancelada = compra.status == StatusCompra.CANCELADA
    dados_mudaram = (compra.valor_compra, compra.data_compra) != (
        anterior.valor_compra, anterior.data_compra
    )
    if conta.status == StatusContaPagar.PAGO:
        if cancelada or dados_mudaram:
            raise HttpError(409, "Reabra a conta no financeiro antes de alterar o valor, a data ou cancelar a compra.")
        return

    novo_status = StatusContaPagar.CANCELADO if cancelada else StatusContaPagar.PENDENTE
    if conta.status != novo_status or conta.valor != compra.valor_compra:
        conta.status = novo_status
        conta.valor = compra.valor_compra
        conta.save(update_fields=["status", "valor", "updated_at"])
    if dados_mudaram:
        Despesa.objects.filter(pk=conta.despesa_id).update(valor=compra.valor_compra, data=compra.data_compra)
