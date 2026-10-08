from django.contrib import admin

from .models import Destinatario, Notificacao, RegraNotificacao


class DestinatarioInline(admin.TabularInline):
    model = Destinatario
    extra = 0
    autocomplete_fields = ("funcionario",)
    readonly_fields = ("lida", "lida_em")


@admin.register(Notificacao)
class NotificacaoAdmin(admin.ModelAdmin):
    list_display = ("titulo", "tipo", "importancia", "created_at")
    list_filter = ("importancia", "tipo")
    search_fields = ("titulo", "mensagem")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at", "updated_at")
    inlines = [DestinatarioInline]


@admin.register(RegraNotificacao)
class RegraNotificacaoAdmin(admin.ModelAdmin):
    list_display = ("tipo", "ativa", "dias", "importancia")
    list_editable = ("ativa", "dias", "importancia")
    filter_horizontal = ("setores_destino",)

    def has_add_permission(self, request):
        return False
