from ninja import Router
from ninja.errors import HttpError
from accounts.authentication import JWTAuth, pode_gerenciar
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404

from employees.models import Funcionario
from sales.purchase_finance import registrar_compra_do_novo_lote

from . import services

from .models import CategoriaProduto, Produto, Lote
from .schemas import (
    CategoriaProdutoIn,
    CategoriaProdutoOut,
    EntradaIn,
    ProdutoCriadoOut,
    ProdutoIn,
    ProdutoOut,
    SaidaIn,
    LoteIn,
    LoteOut,
    CategoriaProdutoUpdate,
    ProdutoUpdate,
    LoteUpdate,
)

router = Router(tags=["stock"], auth=JWTAuth())


def _responsavel(request, funcionario_id: int | None) -> int:
    """Funcionário que assina a compra do lote.

    Quem tem funcionário vinculado compra em seu nome. Gerentes/administradores sem vínculo
    (ex.: o usuário administrador) escolhem o responsável.
    """
    proprio = request.user.funcionario_id
    if funcionario_id is not None and funcionario_id != proprio:
        if not pode_gerenciar(request.user):
            raise HttpError(403, "Você só pode lançar compras em seu próprio nome.")
        if not Funcionario.objects.filter(id=funcionario_id).exists():
            raise HttpError(404, "Funcionário não encontrado.")
        return funcionario_id
    if proprio is None:
        raise HttpError(422, "Escolha o funcionário responsável pela compra.")
    return proprio


@router.get("/categorias", response=list[CategoriaProdutoOut])
def list_categorias(request):
    """
    Lista todas as categorias de produtos.
    """
    return CategoriaProduto.objects.order_by("nome")

@router.post("/categorias", response={201: CategoriaProdutoOut})
def create_categoria(request, payload: CategoriaProdutoIn):
    nome = payload.nome.strip()

    if not nome:
        raise HttpError(422, "Informe o nome da categoria.")

    if CategoriaProduto.objects.filter(nome=nome).exists():
        raise HttpError(409, "Já existe uma categoria com esse nome.")

    try:
        with transaction.atomic():  # Garante que a criação da categoria seja atômica, ou seja, se ocorrer algum erro durante a criação da categoria, nenhuma alteração será feita no banco de dados.
            categoria = CategoriaProduto.objects.create(nome=nome)
    except IntegrityError:  # Garante que não haja duplicidade de categorias, caso ocorra uma violação da constraint de unicidade definida no modelo CategoriaProduto.
        if CategoriaProduto.objects.filter(nome=nome).exists():
            raise HttpError(409, "Já existe uma categoria com esse nome.")
        raise
    
    return 201, categoria

@router.get("/produtos", response=list[ProdutoOut])
def list_produtos(request):
    """
    Lista todos os produtos.
    """
    return Produto.objects.order_by("nome")

@router.post("/produtos", response={201: ProdutoCriadoOut})
def create_produto(request, payload: ProdutoIn):
    nome = payload.nome.strip()
    especificacao = payload.especificacao.strip()
    categoria_id = payload.categoria_id

    if not nome:
        raise HttpError(422, "Informe o nome do produto.")


    try:
        categoria = CategoriaProduto.objects.get(id=categoria_id)
    except CategoriaProduto.DoesNotExist:
        raise HttpError(404, "Categoria não encontrada.")

    inicial = payload.lote
    if inicial is not None:
        # O lote vira uma compra no financeiro, então precisa de um valor para lançar.
        sem_valor = payload.valor_unitario is None or payload.valor_unitario <= 0
        if sem_valor and inicial.valor_total is None:
            raise HttpError(422, "Informe o valor unitário do produto (ou o valor total do lote) para cadastrar o lote.")

    # Produto e lote inicial entram juntos: se o lote falhar, o produto também não é criado.
    with transaction.atomic():
        produto = Produto.objects.create(
            nome=nome,
            especificacao=especificacao,
            categoria=categoria,
            valor_unitario=payload.valor_unitario,
        )
        produto.lote = None
        if inicial is not None:
            produto.lote = services.entrada(
                produto,
                inicial.quantidade,
                _responsavel(request, inicial.funcionario_id),
                valor_total=inicial.valor_total,
                numero_lote=inicial.numero_lote,
                data_validade=inicial.data_validade,
                motivo="Lote inicial do produto",
            )
    return 201, produto


@router.post("/produtos/{int:produto_id}/entrada", response={201: LoteOut})
def entrada_estoque(request, produto_id: int, payload: EntradaIn):
    """Aumenta o estoque manualmente: cria um lote e lança a compra (valor total editável)."""
    with transaction.atomic():
        produto = get_object_or_404(Produto.objects.select_for_update(), id=produto_id)
        lote = services.entrada(
            produto,
            payload.quantidade,
            _responsavel(request, payload.funcionario_id),
            valor_total=payload.valor_total,
            numero_lote=payload.numero_lote,
            data_validade=payload.data_validade,
            motivo=payload.motivo.strip() or "Entrada manual",
        )
    return 201, lote


@router.post("/produtos/{int:produto_id}/saida", response=list[LoteOut])
def saida_estoque(request, produto_id: int, payload: SaidaIn):
    """Diminui o estoque manualmente (os lotes que vencem primeiro saem primeiro). Devolve os lotes alterados."""
    with transaction.atomic():
        produto = get_object_or_404(Produto.objects.select_for_update(), id=produto_id)
        usados = services.saida(
            produto, payload.quantidade, request.user.funcionario_id, payload.motivo.strip() or "Saída manual"
        )
    return [lote for lote, _ in usados]


@router.get("/lotes", response=list[LoteOut])
def list_lotes(request):
    """
    Lista todos os lotes.
    """
    return Lote.objects.order_by("data_validade")   

@router.post("/lotes", response={201: LoteOut})
def create_lote(request, payload: LoteIn):
    quantidade = payload.quantidade
    data_validade = payload.data_validade
    numero_lote = payload.numero_lote.strip()
    produto_id = payload.produto_id

    if not numero_lote:
        raise HttpError(422, "Informe o número do lote.")
    funcionario_id = _responsavel(request, payload.funcionario_id)

    try:
        with transaction.atomic():
            produto = get_object_or_404(Produto.objects.select_for_update(), id=produto_id)
            lote = Lote.objects.create(
                quantidade=quantidade,
                data_validade=data_validade,
                numero_lote=numero_lote,
                produto=produto,
            )
            registrar_compra_do_novo_lote(lote, funcionario_id)
    except IntegrityError:
        if Lote.objects.filter(
            produto_id=produto_id,
            numero_lote=numero_lote,
        ).exists():
            raise HttpError(
                409,
                "Já existe um lote com esse número para o produto informado.",
            )
        raise

    return 201, lote


def _update_data(payload, anulaveis=()):
    dados = payload.model_dump(exclude_unset=True)
    for campo, valor in dados.items():
        if valor is None and campo not in anulaveis:
            raise HttpError(422, f"O campo {campo} não pode ser nulo.")
        if isinstance(valor, str):
            dados[campo] = valor.strip()
            if campo in ("nome", "numero_lote") and not dados[campo]:
                raise HttpError(422, f"Informe o campo {campo}.")
    return dados


@router.patch("/categorias/{int:categoria_id}", response=CategoriaProdutoOut)
def update_categoria(request, categoria_id: int, payload: CategoriaProdutoUpdate):
    dados = _update_data(payload)
    try:
        with transaction.atomic():
            categoria = get_object_or_404(
                CategoriaProduto.objects.select_for_update(), id=categoria_id
            )
            for campo, valor in dados.items():
                setattr(categoria, campo, valor)
            categoria.save()
    except IntegrityError:
        if "nome" in dados and CategoriaProduto.objects.filter(
            nome=dados["nome"]
        ).exclude(id=categoria_id).exists():
            raise HttpError(409, "Já existe uma categoria com esse nome.")
        raise
    return categoria


@router.patch("/produtos/{int:produto_id}", response=ProdutoOut)
def update_produto(request, produto_id: int, payload: ProdutoUpdate):
    dados = _update_data(payload, anulaveis=("valor_unitario",))
    with transaction.atomic():
        produto = get_object_or_404(Produto.objects.select_for_update(), id=produto_id)
        if "categoria_id" in dados:
            get_object_or_404(
                CategoriaProduto.objects.select_for_update(), id=dados["categoria_id"]
            )
        for campo, valor in dados.items():
            setattr(produto, campo, valor)
        produto.save()
    return produto


@router.patch("/lotes/{int:lote_id}", response=LoteOut)
def update_lote(request, lote_id: int, payload: LoteUpdate):
    dados = _update_data(payload, anulaveis=("data_validade",))
    with transaction.atomic():
        lote = get_object_or_404(Lote.objects.select_for_update(), id=lote_id)
        for campo, valor in dados.items():
            setattr(lote, campo, valor)
        # O savepoint permite consultar conflitos após a falha do save.
        try:
            with transaction.atomic():
                lote.save()
        except IntegrityError:
            if Lote.objects.filter(
                produto_id=lote.produto_id, numero_lote=lote.numero_lote
            ).exclude(id=lote_id).exists():
                raise HttpError(409, "Já existe um lote com esse número para o produto informado.")
            raise
    return lote


@router.delete("/produtos/{int:produto_id}", response={204: None})
def delete_produto(request, produto_id: int):
    try:
        with transaction.atomic():
            produto = get_object_or_404(Produto.objects.select_for_update(), id=produto_id)
            produto.delete()
    except ProtectedError:
        raise HttpError(409, "Não é possível excluir um produto com registros vinculados.")
    return 204, None


@router.delete("/lotes/{int:lote_id}", response={204: None})
def delete_lote(request, lote_id: int):
    try:
        with transaction.atomic():
            lote = get_object_or_404(Lote.objects.select_for_update(), id=lote_id)
            lote.delete()
    except ProtectedError:
        raise HttpError(409, "Não é possível excluir um lote com registros vinculados.")
    return 204, None
