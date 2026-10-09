from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('employees', '0002_desligamento_and_more')]
    operations = [migrations.AddField(
        model_name='cargo', name='papel_acesso',
        field=models.CharField(max_length=20, default='COMUM', choices=[
            ('COMUM', 'Comum'), ('GERENTE', 'Gerente'), ('ADMINISTRADOR', 'Administrador')]),
    )]
