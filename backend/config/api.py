from ninja_extra import NinjaExtraAPI
from ninja_jwt.controller import NinjaJWTDefaultController

from accounts.api import router as accounts_router
from tasks.api import router as tasks_router
from vehicles.api import router as vehicles_router
from stock.api import router as stock_router

api = NinjaExtraAPI(title="QuickDrive API", version="1.0.0")

api.register_controllers(NinjaJWTDefaultController)

api.add_router("/accounts", accounts_router)
api.add_router("/tasks", tasks_router)
api.add_router("/vehicles", vehicles_router)
api.add_router("/stock", stock_router)