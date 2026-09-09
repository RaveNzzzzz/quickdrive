from django.conf import settings
from django.db import models


class Task(models.Model):
    title = models.CharField("título", max_length=200)
    description = models.TextField("descrição", blank=True)
    done = models.BooleanField("concluída", default=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tasks",
        verbose_name="responsável",
    )
    created_at = models.DateTimeField("criada em", auto_now_add=True)
    updated_at = models.DateTimeField("atualizada em", auto_now=True)

    class Meta:
        verbose_name = "tarefa"
        verbose_name_plural = "tarefas"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["owner", "done"])]

    def __str__(self) -> str:
        return self.title
