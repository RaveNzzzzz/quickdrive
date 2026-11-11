from django.contrib import admin

from .models import RegistroRequisicao


@admin.register(RegistroRequisicao)
class RegistroRequisicaoAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "metodo", "rota", "status_http", "usuario_id", "duracao_ms")
    list_filter = ("metodo", "status_http")
    search_fields = ("=id", "=usuario_id", "=token_fingerprint", "rota")
    readonly_fields = tuple(field.name for field in RegistroRequisicao._meta.fields)
    date_hierarchy = "timestamp"

    def has_module_permission(self, request):
        return request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
