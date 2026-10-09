from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "first_name", "last_name", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name")
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Dados adicionais", {"fields": ("phone", "funcionario")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Funcionário", {"fields": ("funcionario", "email")}),
    )
