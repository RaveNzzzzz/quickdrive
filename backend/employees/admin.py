from django.contrib import admin

from .models import Cargo, Desligamento, Funcionario, Setor


class DesligamentoInline(admin.StackedInline):
    model = Desligamento
    extra = 0
    max_num = 1
    can_delete = False


@admin.register(Setor)
class SetorAdmin(admin.ModelAdmin):
    list_display = ("nome",)
    search_fields = ("nome",)
    ordering = ("nome",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(Cargo)
class CargoAdmin(admin.ModelAdmin):
    list_display = ("nome", "setor", "descricao")
    list_filter = ("setor",)
    search_fields = ("nome", "descricao", "setor__nome")
    list_select_related = ("setor",)
    autocomplete_fields = ("setor",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(Funcionario)
class FuncionarioAdmin(admin.ModelAdmin):
    list_display = ("codigo", "pessoa", "cargo", "ativo", "regime_contratacao", "data_admissao")
    list_filter = ("ativo", "regime_contratacao", "cargo__setor", "cargo")
    search_fields = ("codigo", "pessoa__nome", "pessoa__email", "pessoa__cpf_cnpj")
    list_select_related = ("pessoa", "cargo__setor")
    autocomplete_fields = ("pessoa", "cargo")
    date_hierarchy = "data_admissao"
    ordering = ("pessoa__nome",)
    readonly_fields = ("codigo", "ativo", "created_at", "updated_at")
    inlines = [DesligamentoInline]

    fieldsets = (
        ("Identificação", {"fields": ("pessoa", "codigo", "cargo", "ativo")}),
        (
            "Contrato",
            {"fields": ("regime_contratacao", "data_admissao", ("inicio_expediente", "final_expediente"))},
        ),
        ("Remuneração", {"fields": ("salario", "comissao")}),
        ("Dados bancários", {"fields": ("banco", "agencia", "numero_conta", "tipo_conta", "chave_pix")}),
        ("Auditoria", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
