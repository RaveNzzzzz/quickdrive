from django.contrib import admin

from .models import Endereco, Pessoa


class EnderecoInline(admin.StackedInline):
    model = Endereco
    extra = 0
    max_num = 1
    min_num = 1
    validate_min = True
    can_delete = False


@admin.register(Pessoa)
class PessoaAdmin(admin.ModelAdmin):
    list_display = ("nome", "email", "telefone", "cpf_cnpj", "tipo_pessoa")
    list_filter = ("tipo_pessoa",)
    search_fields = ("nome", "email", "cpf_cnpj")
    ordering = ("nome",)
    readonly_fields = ("created_at", "updated_at")
    inlines = [EnderecoInline]
