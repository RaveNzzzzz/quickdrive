from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Usuário do projeto.

    Herda de AbstractUser, então já vem com username, email, first_name,
    last_name, is_staff, is_active, is_superuser, date_joined e o sistema
    de permissões/grupos do Django.

    Adicione aqui os campos específicos do projeto.
    """

    email = models.EmailField("e-mail", unique=True)
    phone = models.CharField("telefone", max_length=20, blank=True)

    class Meta:
        verbose_name = "usuário"
        verbose_name_plural = "usuários"

    def __str__(self) -> str:
        return self.get_full_name() or self.username