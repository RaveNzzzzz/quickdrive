from django.contrib import admin

from .models import Compra, Negociacao, NegociacaoEvento, Venda

admin.site.register(Venda)
admin.site.register(Compra)
admin.site.register(Negociacao)
admin.site.register(NegociacaoEvento)
