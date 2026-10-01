import re

from django.core.validators import RegexValidator

apenas_digitos = RegexValidator(r"^\d+$", "Use apenas números.")
telefone_valido = RegexValidator(r"^\d{10,11}$", "Informe DDD + número (10 ou 11 dígitos).")
cep_valido = RegexValidator(r"^\d{8}$", "O CEP deve ter 8 dígitos.")


def cpf_valido(valor: str) -> bool:
    if len(valor) != 11 or not valor.isdigit() or valor == valor[0] * 11:
        return False
    for i in (9, 10):
        soma = sum(int(valor[n]) * (i + 1 - n) for n in range(i))
        if (soma * 10 % 11) % 10 != int(valor[i]):
            return False
    return True


def cnpj_valido(cnpj: str) -> bool:
    pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

    def digito_validador_cnpj(base: str, pesos) -> int:
        soma = sum((ord(c) - 48) * p for c, p in zip(base, pesos))
        resto = soma % 11
        return 0 if resto < 2 else 11 - resto

    cnpj = re.sub(r"[./-]", "", cnpj).upper()
    if not re.fullmatch(r"[A-Z0-9]{12}\d{2}", cnpj) or cnpj == cnpj[0] * 14:
        return False
    d1 = digito_validador_cnpj(cnpj[:12], pesos1)
    d2 = digito_validador_cnpj(cnpj[:12] + str(d1), pesos2)
    return d1 == int(cnpj[12]) and d2 == int(cnpj[13])
