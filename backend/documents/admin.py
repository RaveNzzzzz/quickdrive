from django.contrib import admin

from .models import DocumentoCliente, DocumentoFuncionario, TipoDocumento


@admin.register(TipoDocumento)
class TipoDocumentoAdmin(admin.ModelAdmin):
    list_display = ("nome",)
    search_fields = ("nome",)
    ordering = ("nome",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(DocumentoCliente)
class DocumentoClienteAdmin(admin.ModelAdmin):
    list_display = ("tipo", "cliente", "situacao", "vencimento", "updated_at")
    list_filter = ("situacao", "tipo")
    search_fields = ("cliente__pessoa__nome", "cliente__pessoa__cpf_cnpj")
    list_select_related = ("tipo", "cliente__pessoa")
    autocomplete_fields = ("cliente", "tipo")
    date_hierarchy = "vencimento"
    readonly_fields = ("situacao", "created_at", "updated_at")


@admin.register(DocumentoFuncionario)
class DocumentoFuncionarioAdmin(admin.ModelAdmin):
    list_display = ("tipo", "funcionario", "situacao", "vencimento", "updated_at")
    list_filter = ("situacao", "tipo")
    search_fields = ("funcionario__pessoa__nome", "funcionario__pessoa__cpf_cnpj")
    list_select_related = ("tipo", "funcionario__pessoa")
    autocomplete_fields = ("funcionario", "tipo")
    date_hierarchy = "vencimento"
    readonly_fields = ("situacao", "created_at", "updated_at")
