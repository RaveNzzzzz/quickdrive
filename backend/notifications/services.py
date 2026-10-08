import logging

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from employees.models import Funcionario
from people.services import salvar

from .detectores import DETECTORES
from .enums import REGRAS_PADRAO
from .models import Destinatario, Notificacao, RegraNotificacao


@transaction.atomic
def criar_notificacao(
    dados: dict, funcionarios_ids: list[int], todos_ativos: bool = False
) -> Notificacao:
    """Cria a notificação e seus destinatários. Só funcionários ativos recebem."""
    if todos_ativos:
        funcionarios = list(Funcionario.objects.filter(ativo=True))
    else:
        ids = set(funcionarios_ids)
        funcionarios = list(Funcionario.objects.filter(id__in=ids, ativo=True))
        faltando = ids - {f.id for f in funcionarios}
        if faltando:
            raise ValidationError(
                {
                    "funcionarios_ids": f"Funcionários inexistentes ou desligados: {sorted(faltando)}."
                }
            )

    if not funcionarios:
        raise ValidationError({"funcionarios_ids": "Informe ao menos um destinatário."})

    notificacao = salvar(Notificacao(**dados), "notificacao")
    Destinatario.objects.bulk_create(
        [Destinatario(notificacao=notificacao, funcionario=f) for f in funcionarios]
    )
    return notificacao


def marcar_lida(destinatario: Destinatario, lida: bool = True) -> Destinatario:
    destinatario.lida = lida
    destinatario.lida_em = timezone.now() if lida else None
    destinatario.save(update_fields=["lida", "lida_em", "updated_at"])
    return destinatario


def marcar_todas_lidas(funcionario_id: int) -> int:
    agora = timezone.now()
    return Destinatario.objects.filter(
        funcionario_id=funcionario_id, lida=False
    ).update(lida=True, lida_em=agora, updated_at=agora)


logger = logging.getLogger(__name__)


def obter_regra(tipo: str) -> RegraNotificacao:
    dias, importancia = REGRAS_PADRAO[tipo]
    regra, _ = RegraNotificacao.objects.get_or_create(
        tipo=tipo, defaults={"dias": dias, "importancia": importancia}
    )
    return regra


def _destinatarios(regra):
    qs = Funcionario.objects.filter(ativo=True)
    setores = regra.setores_destino.all()
    if setores:
        qs = qs.filter(cargo__setor__in=setores)
    return list(qs)


def gerar_notificacoes() -> dict[str, int]:
    """Roda todos os detectores e cria só as notificações novas. Devolve {tipo: criadas}."""
    resumo = {}
    for tipo, detector in DETECTORES.items():
        regra = obter_regra(tipo)
        if not regra.ativa:
            continue
        try:
            alertas = list(detector(regra))
            existentes = set(
                Notificacao.objects.filter(
                    chave__in=[a.chave for a in alertas]
                ).values_list("chave", flat=True)
            )
            novos = [a for a in alertas if a.chave not in existentes]
            funcionarios = _destinatarios(regra) if novos else []

            criadas = 0
            for alerta in novos:
                if not funcionarios:
                    break
                with transaction.atomic():
                    notificacao, criada = Notificacao.objects.get_or_create(
                        chave=alerta.chave,
                        defaults={
                            "titulo": alerta.titulo,
                            "mensagem": alerta.mensagem,
                            "tipo": tipo,
                            "importancia": regra.importancia,
                        },
                    )
                    if criada:
                        Destinatario.objects.bulk_create(
                            [
                                Destinatario(notificacao=notificacao, funcionario=f)
                                for f in funcionarios
                            ]
                        )
                        criadas += 1
            resumo[tipo] = criadas
        except Exception:
            logger.exception("Falha ao gerar notificações do tipo %s", tipo)
            resumo[tipo] = -1
    return resumo
