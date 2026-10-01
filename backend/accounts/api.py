from django.contrib.auth import get_user_model
from ninja import Router, Schema
from ninja.errors import HttpError
from ninja_jwt.authentication import JWTAuth
from pydantic import EmailStr, Field

User = get_user_model()
router = Router(tags=["contas"])


class SignupIn(Schema):
    username: str = Field(min_length=3, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str = ""
    last_name: str = ""


class UserOut(Schema):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str


@router.post("/signup", response={201: UserOut})
def signup(request, payload: SignupIn):
    if User.objects.filter(username=payload.username).exists():
        raise HttpError(409, "Nome de usuário já cadastrado.")
    if User.objects.filter(email__iexact=payload.email).exists():
        raise HttpError(409, "E-mail já cadastrado.")

    user = User.objects.create_user(**payload.dict())
    return 201, user


@router.get("/me", response=UserOut, auth=JWTAuth())
def me(request):
    return request.user
