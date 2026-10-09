from django.shortcuts import get_object_or_404
from ninja import File, Form, Query, Router, UploadedFile
from ninja.pagination import paginate
from accounts.authentication import JWTAuth, GestaoJWTAuth

from people.services import definir, salvar

from .models import DocumentoCliente, DocumentoFuncionario, TipoDocumento
from .schemas import (
    DocumentoClienteFiltro,
    DocumentoClienteIn,
    DocumentoClienteOut,
    DocumentoFuncionarioFiltro,
    DocumentoFuncionarioIn,
    DocumentoFuncionarioOut,
    DocumentoUpdate,
    TipoDocumentoIn,
    TipoDocumentoOut,
    TipoDocumentoUpdate,
)
from .services import remover_documento, salvar_documento

# =============== Tipos de documento ===============
tipos_router = Router(tags=["tipos de documento"], auth=JWTAuth())


@tipos_router.get("", response=list[TipoDocumentoOut])
@paginate
def listar_tipos(request):
    return TipoDocumento.objects.all()


@tipos_router.post("", response={201: TipoDocumentoOut})
def criar_tipo(request, payload: TipoDocumentoIn):
    return 201, salvar(TipoDocumento(**payload.dict()))


@tipos_router.get("/{int:tipo_id}", response=TipoDocumentoOut)
def obter_tipo(request, tipo_id: int):
    return get_object_or_404(TipoDocumento, id=tipo_id)


@tipos_router.patch("/{int:tipo_id}", response=TipoDocumentoOut)
def atualizar_tipo(request, tipo_id: int, payload: TipoDocumentoUpdate):
    tipo = get_object_or_404(TipoDocumento, id=tipo_id)
    return salvar(definir(tipo, payload.dict(exclude_unset=True)))


@tipos_router.delete("/{int:tipo_id}", response={204: None})
def remover_tipo(request, tipo_id: int):
    get_object_or_404(TipoDocumento, id=tipo_id).delete()  # PROTECT -> 409 (handler)
    return 204, None


# =============== Documentos de clientes ===============
docs_clientes_router = Router(tags=["documentos de clientes"], auth=JWTAuth())


def _qs_cliente():
    return DocumentoCliente.objects.select_related("tipo")


@docs_clientes_router.get("", response=list[DocumentoClienteOut])
@paginate
def listar_documentos_clientes(request, filtros: DocumentoClienteFiltro = Query(...)):
    return filtros.filter(_qs_cliente())


@docs_clientes_router.post("", response={201: DocumentoClienteOut})
def criar_documento_cliente(
    request,
    payload: DocumentoClienteIn = Form(...),
    arquivo: UploadedFile = File(None),
):
    documento = salvar_documento(DocumentoCliente(), payload.dict(), arquivo)
    return 201, _qs_cliente().get(pk=documento.pk)


@docs_clientes_router.get("/{int:documento_id}", response=DocumentoClienteOut)
def obter_documento_cliente(request, documento_id: int):
    return get_object_or_404(_qs_cliente(), id=documento_id)


@docs_clientes_router.patch("/{int:documento_id}", response=DocumentoClienteOut)
def atualizar_documento_cliente(
    request,
    documento_id: int,
    payload: DocumentoUpdate = Form(...),
    arquivo: UploadedFile = File(None),
):
    documento = get_object_or_404(_qs_cliente(), id=documento_id)
    salvar_documento(documento, payload.dict(exclude_unset=True), arquivo)
    return _qs_cliente().get(pk=documento_id)


@docs_clientes_router.delete("/{int:documento_id}", response={204: None})
def remover_documento_cliente(request, documento_id: int):
    remover_documento(get_object_or_404(DocumentoCliente, id=documento_id))
    return 204, None


# =============== Documentos de funcionários ===============
docs_funcionarios_router = Router(tags=["documentos de funcionários"], auth=GestaoJWTAuth())


def _qs_funcionario():
    return DocumentoFuncionario.objects.select_related("tipo")


@docs_funcionarios_router.get("", response=list[DocumentoFuncionarioOut])
@paginate
def listar_documentos_funcionarios(request, filtros: DocumentoFuncionarioFiltro = Query(...)):
    return filtros.filter(_qs_funcionario())


@docs_funcionarios_router.post("", response={201: DocumentoFuncionarioOut})
def criar_documento_funcionario(
    request,
    payload: DocumentoFuncionarioIn = Form(...),
    arquivo: UploadedFile = File(None),
):
    documento = salvar_documento(DocumentoFuncionario(), payload.dict(), arquivo)
    return 201, _qs_funcionario().get(pk=documento.pk)


@docs_funcionarios_router.get("/{int:documento_id}", response=DocumentoFuncionarioOut)
def obter_documento_funcionario(request, documento_id: int):
    return get_object_or_404(_qs_funcionario(), id=documento_id)


@docs_funcionarios_router.patch("/{int:documento_id}", response=DocumentoFuncionarioOut)
def atualizar_documento_funcionario(
    request,
    documento_id: int,
    payload: DocumentoUpdate = Form(...),
    arquivo: UploadedFile = File(None),
):
    documento = get_object_or_404(_qs_funcionario(), id=documento_id)
    salvar_documento(documento, payload.dict(exclude_unset=True), arquivo)
    return _qs_funcionario().get(pk=documento_id)


@docs_funcionarios_router.delete("/{int:documento_id}", response={204: None})
def remover_documento_funcionario(request, documento_id: int):
    remover_documento(get_object_or_404(DocumentoFuncionario, id=documento_id))
    return 204, None
