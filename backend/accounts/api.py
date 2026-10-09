from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from ninja import Field
from ninja import Router, Schema

from accounts.authentication import JWTAuth, pode_gerenciar
from employees.models import Funcionario
from employees.schemas import CargoOut
from people.schemas import PessoaOut


User = get_user_model()
router = Router(tags=["contas"])


class FuncionarioPerfilOut(Schema):
    id: int
    pessoa: PessoaOut
    cargo: CargoOut


class UserOut(Schema):
    pode_gerenciar: bool

    @staticmethod
    def resolve_pode_gerenciar(user):
        return pode_gerenciar(user)
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    funcionario: FuncionarioPerfilOut | None = None

    @staticmethod
    def resolve_funcionario(user):
        if not user.funcionario_id:
            return None
        return Funcionario.objects.select_related('pessoa__endereco', 'cargo__setor').get(pk=user.funcionario_id)


@router.get("/me", response=UserOut, auth=JWTAuth())
def me(request):
    return request.user


class SenhaIn(Schema):
    nova_senha: str = Field(min_length=8, max_length=128)
    confirmacao: str = Field(min_length=8, max_length=128)


@router.post('/senha', response={204: None}, auth=JWTAuth())
def trocar_senha(request, payload: SenhaIn):
    if payload.nova_senha != payload.confirmacao:
        raise ValidationError({'confirmacao': 'As senhas precisam ser iguais.'})
    user = request.user
    validate_password(payload.nova_senha, user=user)
    user.set_password(payload.nova_senha)
    user.save(update_fields=['password'])
    return 204, None
