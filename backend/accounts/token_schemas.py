from ninja_jwt.schema import TokenRefreshInputSchema, TokenVerifyInputSchema
from ninja_jwt.tokens import RefreshToken, UntypedToken
from ninja_jwt.utils import token_error

from .authentication import JWTAuth


class EmployeeTokenRefreshInputSchema(TokenRefreshInputSchema):
    @token_error
    def to_response_schema(self):
        # A biblioteca renova JWT sem consultar a conta por padrão.
        JWTAuth().get_user(RefreshToken(self.refresh))
        return super().to_response_schema()


class EmployeeTokenVerifyInputSchema(TokenVerifyInputSchema):
    @token_error
    def to_response_schema(self):
        JWTAuth().get_user(UntypedToken(self.token))
        return super().to_response_schema()
