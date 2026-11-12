"""Regras de movimentação do estoque (entrada manual, saída e devolução).

Tudo aqui deve rodar dentro de uma transaction.atomic() do chamador.
"""
from decimal import Decimal

from django.db.models import F
from django.utils import timezone
from ninja.errors import HttpError

from sales.purchase_finance import registrar_compra_do_novo_lote

from .models import Lote, MovimentacaoEstoque, Produto


def disponivel(produto: Produto) -> int:
    return sum(Lote.objects.filter(produto=produto).values_list("quantidade", flat=True))


def _numero_lote_automatico(produto: Produto) -> str:
    base = f"ENT-{timezone.localdate():%Y%m%d}"
    numero, n = base, 1
    while Lote.objects.filter(produto=produto, numero_lote=numero).exists():
        n += 1
        numero = f"{base}-{n}"
    return numero


def entrada(produto, quantidade, funcionario_id, *, valor_total=None, numero_lote=None, data_validade=None, motivo=""):
    """Cria um lote novo, lança a compra no financeiro e registra a movimentação."""
    if funcionario_id is None:
        raise HttpError(422, "Escolha o funcionário responsável pela compra.")
    numero = (numero_lote or "").strip() or _numero_lote_automatico(produto)
    if Lote.objects.filter(produto=produto, numero_lote=numero).exists():
        raise HttpError(409, "Já existe um lote com esse número para o produto informado.")

    lote = Lote.objects.create(
        quantidade=quantidade, data_validade=data_validade, numero_lote=numero, produto=produto
    )
    registrar_compra_do_novo_lote(lote, funcionario_id, valor_total)
    MovimentacaoEstoque.objects.create(
        produto=produto,
        lote=lote,
        tipo=MovimentacaoEstoque.Tipo.ENTRADA,
        quantidade=quantidade,
        valor_total=valor_total
        if valor_total is not None
        else (produto.valor_unitario or Decimal("0")) * quantidade,
        motivo=motivo or "Entrada de estoque",
        funcionario_id=funcionario_id,
    )
    return lote


def saida(produto, quantidade, funcionario_id, motivo=""):
    """Tira `quantidade` do estoque, começando pelos lotes que vencem primeiro.

    Devolve a lista de (lote, quantidade retirada).
    """
    lotes = list(
        Lote.objects.select_for_update()
        .filter(produto=produto, quantidade__gt=0)
        .order_by(F("data_validade").asc(nulls_last=True), "id")
    )
    total = sum(lote.quantidade for lote in lotes)
    if quantidade > total:
        raise HttpError(409, f"Estoque insuficiente de {produto.nome}: disponível {total}, solicitado {quantidade}.")

    restante, usados = quantidade, []
    for lote in lotes:
        if restante == 0:
            break
        retirar = min(lote.quantidade, restante)
        lote.quantidade -= retirar
        lote.save(update_fields=["quantidade"])
        MovimentacaoEstoque.objects.create(
            produto=produto,
            lote=lote,
            tipo=MovimentacaoEstoque.Tipo.SAIDA,
            quantidade=retirar,
            motivo=motivo or "Saída manual",
            funcionario_id=funcionario_id,
        )
        usados.append((lote, retirar))
        restante -= retirar
    return usados


def devolver(lote, quantidade, funcionario_id, motivo=""):
    """Devolve `quantidade` a um lote existente (ex.: procedimento excluído)."""
    lote = Lote.objects.select_for_update().get(pk=lote.pk)
    lote.quantidade += quantidade
    lote.save(update_fields=["quantidade"])
    MovimentacaoEstoque.objects.create(
        produto=lote.produto,
        lote=lote,
        tipo=MovimentacaoEstoque.Tipo.ENTRADA,
        quantidade=quantidade,
        motivo=motivo or "Devolução ao estoque",
        funcionario_id=funcionario_id,
    )
    return lote
