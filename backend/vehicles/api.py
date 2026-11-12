from datetime import date, timedelta
from decimal import Decimal
from io import BytesIO

from django.db import transaction
from django.db.models import Max, Prefetch
from django.db.models.deletion import ProtectedError
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from ninja import File, Query, Router, UploadedFile
from ninja.errors import HttpError
from ninja.pagination import paginate
from PIL import Image, ImageOps, UnidentifiedImageError

from accounts.authentication import JWTAuth
from stock import services as estoque
from stock.models import Produto

from .enums import StatusRevisao, StatusVeiculo
from .models import (
    Cambio,
    Carroceria,
    Combustivel,
    DocumentoVeiculo,
    HistoricoVeiculo,
    Imagem,
    Marca,
    Modelo,
    OpcionalVeiculo,
    Preparacao,
    ProdutoUtilizado,
    Revisao,
    SinistroVeiculo,
    Vaga,
    Veiculo,
)
from .schemas import (
    AlertaOut,
    CambioIn,
    CambioOut,
    CarroceriaIn,
    CarroceriaOut,
    CombustivelIn,
    CombustivelOut,
    DocumentoIn,
    DocumentoOut,
    HistoricoIn,
    HistoricoOut,
    ImagemOut,
    ImagensOrdemIn,
    MarcaIn,
    MarcaOut,
    ModeloIn,
    ModeloOut,
    ModeloUpdate,
    OpcionaisIn,
    OpcionalOut,
    PreparacaoIn,
    PreparacaoOut,
    SinistroIn,
    SinistroOut,
    VagaIn,
    VagaOut,
    VagaUpdate,
    VeiculoIn,
    VeiculoOut,
    VeiculoUpdate,
)

CAMPOS_UNICOS = (("placa", "a placa"), ("chassi", "o chassi"), ("renavam", "o RENAVAM"))
FORMATOS_IMAGEM = {"JPEG", "PNG", "WEBP"}
TAMANHO_MAXIMO_IMAGEM_MB = 5
LADO_MAXIMO_PX = 1600  # a foto é reduzida para caber nisso (economiza espaço no banco)

router = Router(tags=["vehicles"], auth=JWTAuth())


def _checar_unicos(dados: dict, ignorar_id: int | None = None):
    for campo, rotulo in CAMPOS_UNICOS:
        valor = dados.get(campo)
        if valor is None:
            continue
        existe = Veiculo.objects.filter(**{campo: valor})
        if ignorar_id is not None:
            existe = existe.exclude(id=ignorar_id)
        if existe.exists():
            raise HttpError(409, f"Já existe um veículo com {rotulo} {valor}.")


def _checar_nome_opcao(modelo, nome: str, ignorar_id: int | None = None):
    # Evita "Fiat" e "fiat" como duas marcas diferentes.
    existe = modelo.objects.filter(nome__iexact=nome)
    if ignorar_id is not None:
        existe = existe.exclude(id=ignorar_id)
    if existe.exists():
        raise HttpError(409, f'Já existe "{existe.first().nome}" cadastrado.')


def _resolver_modelo_e_vaga(dados: dict, veiculo: Veiculo | None = None):
    """Troca modelo_id/vaga_id pelos objetos do cadastro e mantém os textos `modelo`/`vaga` em dia.

    Confere também que o modelo pertence à marca escolhida.
    """
    marca_id = dados.get("marca_id", veiculo.marca_id if veiculo else None)

    if "modelo_id" in dados:
        modelo = get_object_or_404(Modelo.objects.select_related("marca"), id=dados.pop("modelo_id"))
        dados["modelo_cadastro"] = modelo
        dados["modelo"] = modelo.nome
    elif veiculo is not None and "marca_id" in dados and veiculo.modelo_cadastro_id:
        modelo = veiculo.modelo_cadastro
    else:
        modelo = None
    if modelo is not None and marca_id is not None and modelo.marca_id != marca_id:
        marca = Marca.objects.filter(id=marca_id).first()
        raise HttpError(422, f'O modelo "{modelo.nome}" não pertence à marca {marca.nome if marca else ""}.'.strip())

    if "vaga_id" in dados:
        vaga_id = dados.pop("vaga_id")
        vaga = get_object_or_404(Vaga, id=vaga_id) if vaga_id is not None else None
        dados["vaga_cadastro"] = vaga
        dados["vaga"] = vaga.nome if vaga else ""

    _checar_vaga_livre(dados, veiculo)


def _checar_vaga_livre(dados: dict, veiculo: Veiculo | None):
    """Uma vaga só pode ter um veículo (os vendidos já saíram do pátio e não contam).

    Só confere quando a vaga muda, ou quando um veículo vendido volta para o pátio.
    Assim, dados antigos que já dividiam uma vaga não travam edições sem relação.
    """
    status = dados.get("status", veiculo.status if veiculo else StatusVeiculo.DISPONIVEL)
    if status == StatusVeiculo.VENDIDO:
        return
    vaga = dados["vaga_cadastro"] if "vaga_cadastro" in dados else (veiculo.vaga_cadastro if veiculo else None)
    if vaga is None:
        return

    mudou_vaga = veiculo is None or vaga.id != veiculo.vaga_cadastro_id
    voltou_ao_patio = veiculo is not None and veiculo.status == StatusVeiculo.VENDIDO
    if not (mudou_vaga or voltou_ao_patio):
        return

    ocupante = (
        Veiculo.objects.filter(vaga_cadastro=vaga)
        .exclude(status=StatusVeiculo.VENDIDO)
        .exclude(id=veiculo.id if veiculo else None)
        .select_related("marca")
        .first()
    )
    if ocupante:
        raise HttpError(
            409,
            f"A vaga {vaga.nome} já está ocupada por {ocupante.marca.nome} {ocupante.modelo} ({ocupante.placa}).",
        )


def _checar_anos(ano_modelo: int, ano_fabricacao):
    # O ano do modelo é o mesmo da fabricação ou o seguinte (ex.: fabricado 2025, modelo 2026).
    if ano_modelo not in (ano_fabricacao.year, ano_fabricacao.year + 1):
        raise HttpError(
            422,
            f"O ano do modelo deve ser {ano_fabricacao.year} ou {ano_fabricacao.year + 1} "
            "(igual ou 1 ano após a fabricação).",
        )


# --- Veículos ---


@router.get("", response=list[VeiculoOut])
@paginate
def list_veiculos(request, status: str | None = None, no_patio: bool = False):
    # Mais recentes primeiro (o id desempata veículos que entraram no mesmo dia).
    qs = Veiculo.objects.order_by("-data_entrada", "-id").select_related(
        "marca", "cambio", "combustivel", "carroceria"
    ).prefetch_related(
        # Só a foto principal e SEM os bytes (defer): a lista só precisa saber se existe foto.
        Prefetch(
            "imagens",
            queryset=Imagem.objects.filter(principal=True).defer("arquivo"),
            to_attr="imagem_principal",
        )
    )
    if status is not None:
        qs = qs.filter(status=status)
    if no_patio:
        # Vendidos e em manutenção não estão no pátio (mesma regra da tela do Pátio).
        qs = qs.exclude(status__in=[StatusVeiculo.VENDIDO, StatusVeiculo.MANUTENCAO])
    return qs


@router.post("", response={201: VeiculoOut})
def create_veiculo(request, payload: VeiculoIn):
    dados = payload.dict()
    _checar_anos(dados["ano_modelo"], dados["ano_fabricacao"])
    _checar_unicos(dados)
    _resolver_modelo_e_vaga(dados)
    veiculo = Veiculo.objects.create(**dados)
    HistoricoVeiculo.objects.create(veiculo=veiculo, titulo="Entrada no pátio")
    return 201, veiculo


@router.get("/{int:veiculo_id}", response=VeiculoOut)
def get_veiculo(request, veiculo_id: int):
    return get_object_or_404(Veiculo, id=veiculo_id)


@router.patch("/{int:veiculo_id}", response=VeiculoOut)
def update_veiculo(request, veiculo_id: int, payload: VeiculoUpdate):
    veiculo = get_object_or_404(Veiculo, id=veiculo_id)
    dados = payload.dict(exclude_unset=True)
    _checar_anos(
        dados.get("ano_modelo", veiculo.ano_modelo),
        dados.get("ano_fabricacao", veiculo.ano_fabricacao),
    )
    _checar_unicos(dados, ignorar_id=veiculo.id)
    _resolver_modelo_e_vaga(dados, veiculo)
    status_anterior = veiculo.status
    for campo, valor in dados.items():
        setattr(veiculo, campo, valor)
    veiculo.save()
    if veiculo.status != status_anterior:
        HistoricoVeiculo.objects.create(
            veiculo=veiculo, titulo=f"Status alterado para {veiculo.get_status_display()}"
        )
    return veiculo


@router.delete("/{int:veiculo_id}", response={204: None})
def delete_veiculo(request, veiculo_id: int):
    veiculo = get_object_or_404(Veiculo, id=veiculo_id)
    veiculo.delete()  # as imagens vão junto (on_delete=CASCADE)
    return 204, None


# --- Dados complementares da ficha (opcionais, sinistro, documentos, custos, histórico) ---


@router.put("/{int:veiculo_id}/opcionais", response=list[OpcionalOut])
@transaction.atomic
def definir_opcionais(request, veiculo_id: int, payload: OpcionaisIn):
    veiculo = get_object_or_404(Veiculo, id=veiculo_id)
    veiculo.opcionais.all().delete()
    OpcionalVeiculo.objects.bulk_create(
        [OpcionalVeiculo(veiculo=veiculo, nome=nome) for nome in payload.nomes]
    )
    return veiculo.opcionais.all()


@router.put("/{int:veiculo_id}/sinistro", response=SinistroOut)
def definir_sinistro(request, veiculo_id: int, payload: SinistroIn):
    veiculo = get_object_or_404(Veiculo, id=veiculo_id)
    dados = payload.dict()
    if dados["perda_total"] and not dados["teve_sinistro"]:
        raise HttpError(422, "Perda total exige que o veículo tenha tido sinistro.")
    sinistro, _ = SinistroVeiculo.objects.update_or_create(veiculo=veiculo, defaults=dados)
    return sinistro


@router.post("/{int:veiculo_id}/documentos", response={201: DocumentoOut})
def criar_documento(request, veiculo_id: int, payload: DocumentoIn):
    veiculo = get_object_or_404(Veiculo, id=veiculo_id)
    if veiculo.documentos.filter(nome__iexact=payload.nome).exists():
        raise HttpError(409, f'Já existe o documento "{payload.nome}" neste veículo.')
    return 201, DocumentoVeiculo.objects.create(veiculo=veiculo, **payload.dict())


@router.patch("/{int:veiculo_id}/documentos/{int:documento_id}", response=DocumentoOut)
def atualizar_documento(request, veiculo_id: int, documento_id: int, payload: DocumentoIn):
    documento = get_object_or_404(DocumentoVeiculo, id=documento_id, veiculo_id=veiculo_id)
    outros = documento.veiculo.documentos.filter(nome__iexact=payload.nome).exclude(id=documento.id)
    if outros.exists():
        raise HttpError(409, f'Já existe o documento "{payload.nome}" neste veículo.')
    for campo, valor in payload.dict().items():
        setattr(documento, campo, valor)
    documento.save()
    return documento


@router.delete("/{int:veiculo_id}/documentos/{int:documento_id}", response={204: None})
def remover_documento(request, veiculo_id: int, documento_id: int):
    get_object_or_404(DocumentoVeiculo, id=documento_id, veiculo_id=veiculo_id).delete()
    return 204, None


@router.post("/{int:veiculo_id}/custos-preparacao", response={201: PreparacaoOut})
def criar_custo_preparacao(request, veiculo_id: int, payload: PreparacaoIn):
    """Registra um procedimento no veículo. Os produtos informados saem do estoque (lotes que vencem primeiro)."""
    veiculo = get_object_or_404(Veiculo, id=veiculo_id)
    dados = payload.dict(exclude={"produtos"})
    funcionario_id = request.user.funcionario_id

    with transaction.atomic():
        preparacao = Preparacao.objects.create(veiculo=veiculo, **{**dados, "custo": 0})
        total_produtos = Decimal("0")
        for item in payload.produtos:
            produto = get_object_or_404(Produto.objects.select_for_update(), id=item.produto_id)
            valor_unitario = item.valor_unitario if item.valor_unitario is not None else (produto.valor_unitario or Decimal("0"))
            motivo = f'Procedimento "{preparacao.nome}" — {veiculo.marca} {veiculo.modelo} ({veiculo.placa})'
            for lote, retirado in estoque.saida(produto, item.quantidade, funcionario_id, motivo):
                ProdutoUtilizado.objects.create(
                    preparacao=preparacao, produto=produto, lote=lote, quantidade=retirado, valor_unitario=valor_unitario
                )
            total_produtos += valor_unitario * item.quantidade

        total = dados["custo"] + total_produtos
        if total > Decimal("99999999.99"):
            raise HttpError(422, "O custo total do procedimento excede o limite permitido.")
        preparacao.custo = total
        preparacao.save(update_fields=["custo"])
    return 201, preparacao


@router.delete("/{int:veiculo_id}/custos-preparacao/{int:custo_id}", response={204: None})
def remover_custo_preparacao(request, veiculo_id: int, custo_id: int):
    """Exclui o procedimento e devolve ao estoque os produtos que ele tinha usado."""
    preparacao = get_object_or_404(Preparacao, id=custo_id, veiculo_id=veiculo_id)
    with transaction.atomic():
        for uso in preparacao.produtos_utilizados.select_related("lote", "produto"):
            estoque.devolver(
                uso.lote,
                uso.quantidade,
                request.user.funcionario_id,
                f'Procedimento "{preparacao.nome}" excluído',
            )
        preparacao.delete()
    return 204, None


@router.post("/{int:veiculo_id}/historico", response={201: HistoricoOut})
def criar_historico(request, veiculo_id: int, payload: HistoricoIn):
    veiculo = get_object_or_404(Veiculo, id=veiculo_id)
    return 201, HistoricoVeiculo.objects.create(veiculo=veiculo, **payload.dict())


@router.delete("/{int:veiculo_id}/historico/{int:historico_id}", response={204: None})
def remover_historico(request, veiculo_id: int, historico_id: int):
    get_object_or_404(HistoricoVeiculo, id=historico_id, veiculo_id=veiculo_id).delete()
    return 204, None


# --- Fotos do veículo (guardadas no banco, um veículo pode ter várias) ---

MAX_IMAGENS_POR_VEICULO = 12


def _processar_imagem(arquivo: UploadedFile) -> bytes:
    """Valida a foto, corrige a rotação, reduz o tamanho e devolve os bytes em JPEG."""
    if arquivo.size > TAMANHO_MAXIMO_IMAGEM_MB * 1024 * 1024:
        raise HttpError(422, f"A imagem deve ter no máximo {TAMANHO_MAXIMO_IMAGEM_MB} MB.")
    try:
        with Image.open(arquivo) as img:
            if img.format not in FORMATOS_IMAGEM:
                raise HttpError(422, "Envie uma imagem JPG, PNG ou WEBP.")
            img = ImageOps.exif_transpose(img)  # fotos de celular vêm "deitadas" sem isso
            img.thumbnail((LADO_MAXIMO_PX, LADO_MAXIMO_PX))
            if img.mode in ("RGBA", "LA", "P"):  # PNG transparente -> fundo branco
                img = img.convert("RGBA")
                fundo = Image.new("RGB", img.size, (255, 255, 255))
                fundo.paste(img, mask=img.getchannel("A"))
                img = fundo
            else:
                img = img.convert("RGB")
            saida = BytesIO()
            img.save(saida, format="JPEG", quality=85, optimize=True)
            return saida.getvalue()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HttpError(422, "O arquivo enviado não é uma imagem válida.")


def _imagens(veiculo_id: int):
    return Imagem.objects.filter(veiculo_id=veiculo_id).defer("arquivo")


@router.get("/{int:veiculo_id}/imagens", response=list[ImagemOut])
def listar_imagens(request, veiculo_id: int):
    get_object_or_404(Veiculo, id=veiculo_id)
    return _imagens(veiculo_id)


@router.post("/{int:veiculo_id}/imagens", response=list[ImagemOut])
def enviar_imagens(request, veiculo_id: int, imagens: list[UploadedFile] = File(...)):
    """Adiciona uma ou mais fotos ao veículo. A primeira foto que ele recebe vira a capa."""
    veiculo = get_object_or_404(Veiculo, id=veiculo_id)
    existentes = Imagem.objects.filter(veiculo=veiculo)
    if existentes.count() + len(imagens) > MAX_IMAGENS_POR_VEICULO:
        raise HttpError(422, f"No máximo {MAX_IMAGENS_POR_VEICULO} fotos por veículo.")
    tem_principal = existentes.filter(principal=True).exists()
    proxima_ordem = (existentes.aggregate(Max("ordem"))["ordem__max"] or 0) + 1
    with transaction.atomic():
        for i, arquivo in enumerate(imagens):
            dados = _processar_imagem(arquivo)
            Imagem.objects.create(
                veiculo=veiculo,
                arquivo=dados,
                content_type="image/jpeg",
                nome=arquivo.name[:255],
                principal=not tem_principal and i == 0,
                ordem=proxima_ordem + i,
            )
    return _imagens(veiculo_id)


# auth=None: o <img> do navegador não consegue enviar o token JWT, então esta rota é pública.
# Quem não souber o id da imagem não encontra a foto; para algo mais restrito, use outra abordagem.
@router.get("/{int:veiculo_id}/imagens/{int:imagem_id}", auth=None, response={200: None})
def baixar_imagem(request, veiculo_id: int, imagem_id: int):
    imagem = get_object_or_404(Imagem, id=imagem_id, veiculo_id=veiculo_id)
    resposta = HttpResponse(bytes(imagem.arquivo), content_type=imagem.content_type)
    resposta["Cache-Control"] = "public, max-age=31536000, immutable"  # o ?v= da URL troca ao atualizar
    return resposta


@router.post("/{int:veiculo_id}/imagens/ordenar", response=list[ImagemOut])
def ordenar_imagens(request, veiculo_id: int, payload: ImagensOrdemIn):
    """Redefine a ordem das fotos no carrossel. `ids` precisa conter exatamente as fotos atuais do veículo."""
    get_object_or_404(Veiculo, id=veiculo_id)
    atuais = set(Imagem.objects.filter(veiculo_id=veiculo_id).values_list("id", flat=True))
    if set(payload.ids) != atuais:
        raise HttpError(422, "A lista enviada não corresponde às fotos atuais do veículo.")
    with transaction.atomic():
        for ordem, imagem_id in enumerate(payload.ids):
            Imagem.objects.filter(id=imagem_id).update(ordem=ordem)
    return _imagens(veiculo_id)


@router.post("/{int:veiculo_id}/imagens/{int:imagem_id}/principal", response=list[ImagemOut])
def definir_imagem_principal(request, veiculo_id: int, imagem_id: int):
    with transaction.atomic():
        imagem = get_object_or_404(
            Imagem.objects.select_for_update(), id=imagem_id, veiculo_id=veiculo_id
        )
        if not imagem.principal:
            Imagem.objects.filter(veiculo_id=veiculo_id).exclude(id=imagem_id).update(principal=False)
            imagem.principal = True
            imagem.save(update_fields=["principal", "atualizado_em"])
    return _imagens(veiculo_id)


@router.delete("/{int:veiculo_id}/imagens/{int:imagem_id}", response=list[ImagemOut])
def remover_imagem(request, veiculo_id: int, imagem_id: int):
    with transaction.atomic():
        imagem = get_object_or_404(Imagem, id=imagem_id, veiculo_id=veiculo_id)
        era_principal = imagem.principal
        imagem.delete()
        if era_principal:
            # A foto seguinte do carrossel assume o posto de capa.
            proxima = Imagem.objects.filter(veiculo_id=veiculo_id).order_by("ordem", "id").first()
            if proxima is not None:
                proxima.principal = True
                proxima.save(update_fields=["principal", "atualizado_em"])
    return _imagens(veiculo_id)


# --- Alertas (card da Home) ---

STATUS_FORA_DO_PATIO = [StatusVeiculo.VENDIDO, StatusVeiculo.MANUTENCAO]


def _nome(v: Veiculo) -> str:
    return f"{v.marca.nome} {v.modelo} · {v.placa}"


def _lista_nomes(nomes: list[str], total: int) -> str:
    # Mostra até 2 nomes; se houver mais, completa com "e mais N".
    texto = ", ".join(nomes[:2])
    return f"{texto} e mais {total - 2}" if total > 2 else texto


@router.get("/alertas", response=list[AlertaOut])
def list_alertas(request, dias: int = Query(45, ge=1, le=3650)):
    """`dias` = a partir de quantos dias no pátio o veículo conta como parado (o front manda o mesmo da tela do Pátio)."""
    alertas = []

    # 1) Parados há muito tempo no pátio (do mais antigo para o mais novo).
    parados = list(
        Veiculo.objects.exclude(status__in=STATUS_FORA_DO_PATIO)
        .filter(data_entrada__lte=date.today() - timedelta(days=dias))
        .select_related("marca")
        .order_by("data_entrada", "id")
    )
    if parados:
        mais_antigo = parados[0]
        dias_antigo = (date.today() - mais_antigo.data_entrada).days
        if len(parados) == 1:
            titulo = f"1 veículo há {dias}+ dias no pátio"
            subtitulo = f"{_nome(mais_antigo)} ({dias_antigo} dias). Considere revisar o preço"
        else:
            titulo = f"{len(parados)} veículos há {dias}+ dias no pátio"
            subtitulo = f"Mais antigo: {_nome(mais_antigo)} ({dias_antigo} dias). Considere revisar os preços"
        alertas.append(
            AlertaOut(
                tipo="parados",
                nivel="danger",
                titulo=titulo,
                subtitulo=subtitulo,
                veiculo_id=mais_antigo.id if len(parados) == 1 else None,
            )
        )

    # 2) Veículos em manutenção.
    em_manutencao = list(
        Veiculo.objects.filter(status=StatusVeiculo.MANUTENCAO).select_related("marca").order_by("data_entrada", "id")
    )
    if em_manutencao:
        n = len(em_manutencao)
        alertas.append(
            AlertaOut(
                tipo="manutencao",
                nivel="warning",
                titulo=f"{n} veículo{'s' if n > 1 else ''} em manutenção",
                subtitulo=_lista_nomes([_nome(v) for v in em_manutencao], n),
                veiculo_id=em_manutencao[0].id if n == 1 else None,
            )
        )

    # 3) Revisões ainda não concluídas (da mais antiga para a mais nova).
    revisoes = list(
        Revisao.objects.exclude(status=StatusRevisao.CONCLUIDO)
        .exclude(veiculo__status=StatusVeiculo.VENDIDO)
        .select_related("veiculo__marca")
        .order_by("data", "id")
    )
    if revisoes:
        n = len(revisoes)
        veiculos = {r.veiculo_id for r in revisoes}
        alertas.append(
            AlertaOut(
                tipo="revisao",
                nivel="warning",
                titulo=f"{n} revis{'ões' if n > 1 else 'ão'} pendente{'s' if n > 1 else ''}",
                subtitulo=_lista_nomes([f"{r.nome} – {_nome(r.veiculo)}" for r in revisoes], n),
                veiculo_id=revisoes[0].veiculo_id if len(veiculos) == 1 else None,
            )
        )

    return alertas


# --- Marca ---

@router.get("/opcoes/marcas", response=list[MarcaOut])
def list_marcas(request):
    return Marca.objects.all()


@router.post("/opcoes/marcas", response={201: MarcaOut})
def create_marca(request, payload: MarcaIn):
    _checar_nome_opcao(Marca, payload.nome)
    marca = Marca.objects.create(**payload.dict())
    return 201, marca


@router.patch("/opcoes/marcas/{int:marca_id}", response=MarcaOut)
def update_marca(request, marca_id: int, payload: MarcaIn):
    marca = get_object_or_404(Marca, id=marca_id)
    _checar_nome_opcao(Marca, payload.nome, ignorar_id=marca.id)
    marca.nome = payload.nome
    marca.save()
    return marca


@router.delete("/opcoes/marcas/{int:marca_id}", response={204: None})
def delete_marca(request, marca_id: int):
    marca = get_object_or_404(Marca, id=marca_id)
    try:
        marca.delete()
    except ProtectedError:
        raise HttpError(409, "Não é possível excluir uma marca que tem modelos ou veículos cadastrados.")
    return 204, None


# --- Modelos (de uma marca) ---


def _checar_modelo_unico(marca_id: int, nome: str, ignorar_id: int | None = None):
    existe = Modelo.objects.filter(marca_id=marca_id, nome__iexact=nome)
    if ignorar_id is not None:
        existe = existe.exclude(id=ignorar_id)
    if existe.exists():
        raise HttpError(409, f'Já existe o modelo "{existe.first().nome}" nesta marca.')


@router.get("/opcoes/modelos", response=list[ModeloOut])
def list_modelos(request, marca_id: int | None = None):
    qs = Modelo.objects.all()
    if marca_id is not None:
        qs = qs.filter(marca_id=marca_id)
    return qs


@router.post("/opcoes/modelos", response={201: ModeloOut})
def create_modelo(request, payload: ModeloIn):
    get_object_or_404(Marca, id=payload.marca_id)
    _checar_modelo_unico(payload.marca_id, payload.nome)
    return 201, Modelo.objects.create(nome=payload.nome, marca_id=payload.marca_id)


@router.patch("/opcoes/modelos/{int:modelo_id}", response=ModeloOut)
@transaction.atomic
def update_modelo(request, modelo_id: int, payload: ModeloUpdate):
    modelo = get_object_or_404(Modelo, id=modelo_id)
    dados = payload.dict(exclude_unset=True)
    nome = dados.get("nome", modelo.nome)
    marca_id = dados.get("marca_id", modelo.marca_id)
    if marca_id != modelo.marca_id:
        get_object_or_404(Marca, id=marca_id)
        if modelo.veiculos.exists():
            raise HttpError(409, "Não é possível trocar a marca de um modelo que já tem veículos cadastrados.")
    _checar_modelo_unico(marca_id, nome, ignorar_id=modelo.id)
    modelo.nome, modelo.marca_id = nome, marca_id
    modelo.save()
    # O texto do modelo nos veículos acompanha o cadastro.
    Veiculo.objects.filter(modelo_cadastro=modelo).update(modelo=nome)
    return modelo


@router.delete("/opcoes/modelos/{int:modelo_id}", response={204: None})
def delete_modelo(request, modelo_id: int):
    modelo = get_object_or_404(Modelo, id=modelo_id)
    try:
        modelo.delete()
    except ProtectedError:
        raise HttpError(409, "Não é possível excluir um modelo que tem veículos cadastrados.")
    return 204, None


# --- Vagas do pátio ---


def _checar_vaga_unica(nome: str, ignorar_id: int | None = None):
    existe = Vaga.objects.filter(nome__iexact=nome)
    if ignorar_id is not None:
        existe = existe.exclude(id=ignorar_id)
    if existe.exists():
        raise HttpError(409, f'Já existe a vaga "{existe.first().nome}".')


@router.get("/opcoes/vagas", response=list[VagaOut])
def list_vagas(request):
    vagas = list(Vaga.objects.all())
    ocupantes = {}
    for veiculo in (
        Veiculo.objects.filter(vaga_cadastro__isnull=False)
        .exclude(status=StatusVeiculo.VENDIDO)
        .select_related("marca")
        .order_by("id")
    ):
        ocupantes.setdefault(veiculo.vaga_cadastro_id, veiculo)
    for vaga in vagas:
        vaga.ocupante = ocupantes.get(vaga.id)
    return vagas


@router.post("/opcoes/vagas", response={201: VagaOut})
def create_vaga(request, payload: VagaIn):
    _checar_vaga_unica(payload.nome)
    return 201, Vaga.objects.create(**payload.dict())


@router.patch("/opcoes/vagas/{int:vaga_id}", response=VagaOut)
@transaction.atomic
def update_vaga(request, vaga_id: int, payload: VagaUpdate):
    vaga = get_object_or_404(Vaga, id=vaga_id)
    dados = payload.dict(exclude_unset=True)
    if "nome" in dados:
        _checar_vaga_unica(dados["nome"], ignorar_id=vaga.id)
    for campo, valor in dados.items():
        setattr(vaga, campo, valor)
    vaga.save()
    Veiculo.objects.filter(vaga_cadastro=vaga).update(vaga=vaga.nome)
    return vaga


@router.delete("/opcoes/vagas/{int:vaga_id}", response={204: None})
def delete_vaga(request, vaga_id: int):
    vaga = get_object_or_404(Vaga, id=vaga_id)
    try:
        vaga.delete()
    except ProtectedError:
        raise HttpError(409, "Não é possível excluir uma vaga que tem veículo cadastrado.")
    return 204, None


# --- Câmbio ---

@router.get("/opcoes/cambios", response=list[CambioOut])
def list_cambios(request):
    return Cambio.objects.all()


@router.post("/opcoes/cambios", response={201: CambioOut})
def create_cambio(request, payload: CambioIn):
    _checar_nome_opcao(Cambio, payload.nome)
    cambio = Cambio.objects.create(**payload.dict())
    return 201, cambio


@router.patch("/opcoes/cambios/{int:cambio_id}", response=CambioOut)
def update_cambio(request, cambio_id: int, payload: CambioIn):
    cambio = get_object_or_404(Cambio, id=cambio_id)
    _checar_nome_opcao(Cambio, payload.nome, ignorar_id=cambio.id)
    cambio.nome = payload.nome
    cambio.save()
    return cambio


@router.delete("/opcoes/cambios/{int:cambio_id}", response={204: None})
def delete_cambio(request, cambio_id: int):
    cambio = get_object_or_404(Cambio, id=cambio_id)
    cambio.delete()
    return 204, None


# --- Combustível ---

@router.get("/opcoes/combustiveis", response=list[CombustivelOut])
def list_combustiveis(request):
    return Combustivel.objects.all()


@router.post("/opcoes/combustiveis", response={201: CombustivelOut})
def create_combustivel(request, payload: CombustivelIn):
    _checar_nome_opcao(Combustivel, payload.nome)
    combustivel = Combustivel.objects.create(**payload.dict())
    return 201, combustivel


@router.patch("/opcoes/combustiveis/{int:combustivel_id}", response=CombustivelOut)
def update_combustivel(request, combustivel_id: int, payload: CombustivelIn):
    combustivel = get_object_or_404(Combustivel, id=combustivel_id)
    _checar_nome_opcao(Combustivel, payload.nome, ignorar_id=combustivel.id)
    combustivel.nome = payload.nome
    combustivel.save()
    return combustivel


@router.delete("/opcoes/combustiveis/{int:combustivel_id}", response={204: None})
def delete_combustivel(request, combustivel_id: int):
    combustivel = get_object_or_404(Combustivel, id=combustivel_id)
    combustivel.delete()
    return 204, None


# --- Carroceria ---

@router.get("/opcoes/carrocerias", response=list[CarroceriaOut])
def list_carrocerias(request):
    return Carroceria.objects.all()


@router.post("/opcoes/carrocerias", response={201: CarroceriaOut})
def create_carroceria(request, payload: CarroceriaIn):
    _checar_nome_opcao(Carroceria, payload.nome)
    carroceria = Carroceria.objects.create(**payload.dict())
    return 201, carroceria


@router.patch("/opcoes/carrocerias/{int:carroceria_id}", response=CarroceriaOut)
def update_carroceria(request, carroceria_id: int, payload: CarroceriaIn):
    carroceria = get_object_or_404(Carroceria, id=carroceria_id)
    _checar_nome_opcao(Carroceria, payload.nome, ignorar_id=carroceria.id)
    carroceria.nome = payload.nome
    carroceria.save()
    return carroceria


@router.delete("/opcoes/carrocerias/{int:carroceria_id}", response={204: None})
def delete_carroceria(request, carroceria_id: int):
    carroceria = get_object_or_404(Carroceria, id=carroceria_id)
    carroceria.delete()
    return 204, None