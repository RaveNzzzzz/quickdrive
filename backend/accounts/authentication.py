"""Política central de acesso: conta ativa e vínculo profissional válido."""
from django.contrib.auth.backends import ModelBackend
from ninja_jwt.authentication import JWTAuth as BaseJWTAuth
from ninja_jwt.exceptions import AuthenticationFailed

from employees.models import Funcionario
from ninja.errors import HttpError


def pode_gerenciar(user):
    return bool(user and user.is_active and (user.is_superuser or Funcionario.objects.filter(
        pk=user.funcionario_id, ativo=True, desligamento__isnull=True,
        cargo__papel_acesso__in=['GERENTE', 'ADMINISTRADOR'],
    ).exists()))


def usuario_pode_autenticar(user):
    if user is None or not user.is_active:
        return False
    # Preserva o superusuário e contas anteriores à integração.
    if not user.funcionario_id:
        return True
    # Consulta o estado atual, mesmo se o objeto User já estiver em memória.
    return Funcionario.objects.filter(
        pk=user.funcionario_id, ativo=True, desligamento__isnull=True,
    ).exists()


class EmployeeModelBackend(ModelBackend):
    def user_can_authenticate(self, user):
        return usuario_pode_autenticar(user)


class JWTAuth(BaseJWTAuth):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if not usuario_pode_autenticar(user):
            raise AuthenticationFailed("Conta sem acesso ativo.")
        return user


class GestaoJWTAuth(JWTAuth):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if not pode_gerenciar(user):
            raise HttpError(403, 'Seu cargo não permite acesso a este módulo.')
        return user
