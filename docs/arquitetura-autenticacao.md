# Arquitetura de contas e desligamento

## Responsabilidades

Funcionários mantém Pessoa, Endereco, Cargo e o histórico de desligamento.
Accounts mantém a conta de autenticação e seu vínculo com Funcionario.
O administrador inicial é o superusuário Django existente. Não existe mais
cadastro público: o link Cadastre-se, a rota /cadastro e POST /contas/signup
foram retirados. A criação/vinculação de contas permanece no Django Admin.
Não foi criada uma nova tela administrativa de cadastro nesta alteração.

## Vínculo

User.funcionario é OneToOne, com on_delete=PROTECT: um funcionário pode ter no
máximo uma conta e não pode ser excluído deixando uma conta órfã.
O vínculo aceita nulo para preservar o superusuário inicial e contas legadas.
A migração não tenta vincular automaticamente por e-mail ou nome.

Aplicação: ativar o venv e executar `python manage.py migrate` na pasta backend,
no ambiente/banco adequado. Os testes usam SQLite em memória.

## Migrações no Supabase compartilhado

O Supabase hospeda o PostgreSQL usado pelo Django. As contas de login do projeto
são contas do Django; não são usuários do Supabase Auth. O backend deve apontar
para o mesmo banco em que o superusuário foi criado.

As migrações alteram a estrutura desse banco. Para a integração de contas e
funcionários, precisa estar aplicada `accounts/0002_user_funcionario.py`.
Com o venv ativo, na pasta `backend`, confira:

```powershell
python manage.py showmigrations accounts
python manage.py migrate --plan
python manage.py migrate accounts
```

`[X]` indica uma migração aplicada; `[ ]` indica pendente. O Django registra isso
na tabela `django_migrations`. Após a aplicação, confira novamente `showmigrations`.

Se todos os integrantes apontam para o mesmo banco e esquema do Supabase, basta
uma pessoa aplicar as migrações pendentes. Não é necessário repetir a cada login,
ao iniciar o servidor ou por integrante. Executar `migrate` novamente não reaplica
migrações já registradas. Cada banco independente precisa de sua própria aplicação.

Após receber código com novas migrações, a equipe deve revisar o plano e combinar
quem executará a atualização do banco compartilhado. Para aplicar todas as
migrações pendentes do projeto, usar `python manage.py migrate`. Manter os arquivos
de migração versionados; as credenciais do banco ficam no `.env` local.
Não usar `--fake` para contornar uma coluna ausente: isso apenas marca a migração
como aplicada e pode manter a estrutura incompatível com o código.

No Django Admin, o superusuário pode selecionar Funcionario ao criar ou editar
uma conta. Vincular cada conta de funcionário já existente é parte da adoção.
Enquanto uma conta legada permanecer sem vínculo, apenas seu is_active controla
o acesso; desligar um funcionário não pode bloquear uma conta sem relação com ele.
Contas comuns não precisam de is_staff ou is_superuser para usar o frontend.

## Regra de autenticação

Uma conta deve estar ativa. Quando vinculada a funcionário, este deve estar
ativo e sem registro de Desligamento. Consulta-se o banco, e não uma informação
congelada no token. A regra vale também para superusuário se ele for vinculado.
O superusuário sem vínculo permanece funcional para administrar a instalação.

accounts.authentication.usuario_pode_autenticar é a política central.
EmployeeModelBackend aplica a política ao login e às sessões do Django Admin.
JWTAuth aplica a política em cada requisição autenticada da API; todos os routers
existentes usam essa classe. Os schemas de refresh e verify consultam a mesma
política antes de renovar ou confirmar um token. O login JWT usa a regra central.
Não modificar pacotes de terceiros e não usar autenticação JWT stateless nos routers.

## Desligamento

Desligamento.save mantém o histórico, marca Funcionario.ativo=False e marca
User.is_active=False na mesma transação. Se a transação falhar, as três operações
são revertidas. O endpoint retorna FuncionarioOut, como seu contrato declara.

Uma sessão já aberta perde acesso na próxima requisição autenticada, sem aguardar
o token expirar. O refresh antigo também é recusado. Não existe push automático
que fecha uma página ociosa. No frontend, um 401 definitivo limpa os tokens e
notifica AuthContext para voltar ao login, incluindo falha na renovação.

Marcar só User.is_active=True não reabilita funcionário desligado. Alterar
Funcionario.ativo para False também bloqueia acesso, mesmo sem criar histórico.
Excluir/reverter um desligamento não reativa automaticamente a conta; readmissão
requer uma política futura explícita. Não tratar esta implementação como fluxo
de readmissão nem simplesmente reutilizar credenciais sem revisão administrativa.

## Cargo e permissões

Cargo.papel_acesso define COMUM, GERENTE ou ADMINISTRADOR. Somente os dois últimos
e o superusuário ativo têm acesso à gestão. O nome do cargo não concede acesso.
Contas comuns sem funcionário vinculado também não recebem acesso à gestão.
GestaoJWTAuth consulta o cargo atual em cada requisição e retorna 403 para acesso
negado em funcionários, cargos, setores e documentos de funcionários.
O perfil próprio permanece disponível pela autenticação comum.

`/contas/me` retorna `pode_gerenciar` para o frontend ocultar menus e busca,
e bloquear as rotas de Financeiro (incluindo FinanceiroFigma), Funcionários,
Cargos e Setores. Atualmente não há módulo financeiro na API; ao implementá-lo,
usar GestaoJWTAuth. A API revoga acesso imediatamente após mudança de cargo;
menus refletem mudanças ao retornar o foco à janela, recarregar a aplicação ou fazer novo login.

Aplicar `python manage.py migrate` no banco compartilhado para incluir
`employees/0003_cargo_papel_acesso.py`. Todos os cargos existentes começam como
COMUM. O superusuário deve editar os cargos apropriados no Django Admin ou na
tela de cargos e selecionar GERENTE/ADMINISTRADOR. O papel vale para todos os
funcionários daquele cargo. A migração foi aplicada no Supabase configurado em
08/10/2026 durante a correção do acesso administrativo; outros bancos precisam
aplicá-la separadamente.

## Testes e manutenção

python manage.py test accounts stock --settings=stock.test_settings

Cobertura: login/refresh ativo, bloqueio após desligamento, sessão Django,
access/refresh/verify anteriores, routers protegidos, conta reativada manualmente,
funcionário inativo, superusuário sem vínculo, unicidade do vínculo, rollback,
contrato do endpoint de desligamento e remoção do cadastro público.

Ao adicionar um router, importar JWTAuth de accounts.authentication. Ao adicionar
outro tipo de token, aplicar a mesma política. Não confiar somente em esconder
botões no frontend ou no tempo de expiração do JWT para bloquear um desligado.
