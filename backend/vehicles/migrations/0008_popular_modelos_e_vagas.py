from django.db import migrations


def popular(apps, schema_editor):
    """Cria os cadastros de modelo e de vaga a partir do texto que os veículos já têm."""
    Veiculo = apps.get_model("vehicles", "Veiculo")
    Modelo = apps.get_model("vehicles", "Modelo")
    Vaga = apps.get_model("vehicles", "Vaga")

    modelos: dict[tuple[int, str], object] = {}
    vagas: dict[str, object] = {}
    for veiculo in Veiculo.objects.all():
        chave = (veiculo.marca_id, veiculo.modelo.strip().casefold())
        if veiculo.modelo.strip():
            if chave not in modelos:
                modelos[chave] = Modelo.objects.create(nome=veiculo.modelo.strip(), marca_id=veiculo.marca_id)
            veiculo.modelo_cadastro = modelos[chave]

        nome_vaga = veiculo.vaga.strip()
        if nome_vaga:
            if nome_vaga.casefold() not in vagas:
                vagas[nome_vaga.casefold()] = Vaga.objects.create(nome=nome_vaga)
            veiculo.vaga_cadastro = vagas[nome_vaga.casefold()]
        veiculo.save(update_fields=["modelo_cadastro", "vaga_cadastro"])


class Migration(migrations.Migration):
    dependencies = [("vehicles", "0007_modelo_vaga")]

    operations = [migrations.RunPython(popular, migrations.RunPython.noop)]
