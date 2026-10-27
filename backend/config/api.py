from django.core.exceptions import ValidationError
from django.db.models import ProtectedError, RestrictedError
from ninja_extra import NinjaExtraAPI
from ninja_jwt.controller import NinjaJWTDefaultController

from accounts.api import router as contas_router
from customers.api import router as clientes_router
from documents.api import docs_clientes_router, docs_funcionarios_router, tipos_router
from employees.api import cargos_router, funcionarios_router, setores_router
from vehicles.api import router as veiculos_router
from stock.api import router as estoque_router
from sales.api import compras_router, negociacoes_router, vendas_router
from financial.api import (
    contas_pagar_router,
    contas_receber_router,
    despesas_router,
    receitas_router,
)

api = NinjaExtraAPI(title="QuickDrive API", version="1.0.0")

api.register_controllers(NinjaJWTDefaultController)


api.add_router("/contas", contas_router)

api.add_router("/setores", setores_router)
api.add_router("/cargos", cargos_router)
api.add_router("/funcionarios", funcionarios_router)

api.add_router("/clientes", clientes_router)

api.add_router("/documentos/tipos", tipos_router, tags=["tipos documentos"])
api.add_router(
    "/documentos/clientes", docs_clientes_router, tags=["documentos clientes"]
)
api.add_router(
    "/documentos/funcionarios",
    docs_funcionarios_router,
    tags=["documentos funcionários"],
)
api.add_router("/veiculos", veiculos_router)
api.add_router("/estoque", estoque_router)

api.add_router("/vendas", vendas_router)
api.add_router("/compras", compras_router)
api.add_router("/negociacoes", negociacoes_router)

api.add_router("/financeiro/receitas", receitas_router)
api.add_router("/financeiro/despesas", despesas_router)
api.add_router("/financeiro/contas-receber", contas_receber_router)
api.add_router("/financeiro/contas-pagar", contas_pagar_router)

@api.exception_handler(ValidationError)
def validation_error(request, exc):
    detail = exc.message_dict if hasattr(exc, "error_dict") else exc.messages
    return api.create_response(request, {"detail": detail}, status=422)


@api.exception_handler(ProtectedError)
@api.exception_handler(RestrictedError)
def em_uso(request, exc):
    return api.create_response(
        request,
        {"detail": "Registro em uso por outros dados e não pode ser removido."},
        status=409,
    )
