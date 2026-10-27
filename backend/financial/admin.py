from django.contrib import admin

from .models import ContaPagar, ContaReceber, Despesa, Receita

admin.site.register(Receita)
admin.site.register(Despesa)
admin.site.register(ContaReceber)
admin.site.register(ContaPagar)
