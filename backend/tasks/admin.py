from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "done", "created_at")
    list_filter = ("done", "created_at")
    search_fields = ("title", "description")
    autocomplete_fields = ("owner",)
    date_hierarchy = "created_at"
