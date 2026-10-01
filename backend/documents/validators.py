from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator

TAMANHO_MAXIMO_MB = 5

extensao_permitida = FileExtensionValidator(["pdf", "png", "jpg", "jpeg"])


def tamanho_maximo(arquivo):
    if arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024:
        raise ValidationError(f"O arquivo deve ter no máximo {TAMANHO_MAXIMO_MB} MB.")
