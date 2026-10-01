from django.contrib import admin

from .models import Cliente


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ("codigo", "pessoa", "ativo", "created_at")
    list_filter = ("ativo", "pessoa__tipo_pessoa")
    search_fields = (
        "codigo",
        "pessoa__nome",
        "pessoa__email",
        "pessoa__cpf_cnpj",
    )
    list_select_related = ("pessoa",)
    autocomplete_fields = ("pessoa",)
    date_hierarchy = "created_at"
    ordering = ("pessoa__nome",)
    readonly_fields = ("codigo", "ultima_interacao", "created_at", "updated_at")
    actions = ["inativar", "reativar"]

    @admin.action(description="Inativar clientes selecionados")
    def inativar(self, request, queryset):
        queryset.update(ativo=False)

    @admin.action(description="Reativar clientes selecionados")
    def reativar(self, request, queryset):
        queryset.update(ativo=True)

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
