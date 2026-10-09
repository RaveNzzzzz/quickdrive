# Entrega de 08/10/2026 e guia de administração

## Alterações entregues

- Funcionários: listagem real da API, filtros, indicadores, paginação, cadastro,
  edição e desligamento com histórico. Cadastro não cria credenciais automaticamente.
- Formulário de funcionário: dados pessoais, endereço, contrato, remuneração e
  banco conforme os campos do backend. Setor e Cargo são seletores separados;
  escolher setor filtra cargos, e trocar setor limpa a seleção anterior.
- Cargos e Setores: telas próprias, busca, cadastro e edição integrados. A tabela
  de Cargos mostra seu setor e papel de acesso; Setores mostra os cargos vinculados.
- Perfil: dados da Pessoa do funcionário vinculado, endereço, cargo e setor,
  consultados novamente ao abrir a tela. Conta sem vínculo usa os dados do User.
- Acesso: cargo define COMUM, GERENTE ou ADMINISTRADOR. Apenas os dois últimos
  e o superusuário ativo acessam Funcionários, Cargos, Setores e Financeiro.
  Menus, busca e rotas respeitam a regra. API de gestão e documentos de funcionários
  devolve 403 para cargo comum. Financeiro ainda não possui backend neste projeto.
- Conta e funcionário: vínculo individual, desligamento desativa a conta vinculada
  e impede login, renovação e uso de tokens antigos na API. Cadastro público retirado.
- Senha: alteração autenticada pelo perfil, persistida com hash Django, sem código
  por e-mail. Validadores de senha e confirmação permanecem ativos.
- CPF: 11 dígitos e unicidade, sem cálculo de dígitos verificadores no modelo Pessoa.
  A regra vale para os demais cadastros de pessoas físicas também.
- Interface: correção do sublinhado em links com aparência de botão e mensagens
  legíveis dos erros de campos da API. Busca global usa funcionários reais e
  respeita o acesso ao módulo.

## Relações importantes

`User → Funcionario → Pessoa` e `Funcionario → Cargo → Setor`.
Cada cargo pertence a um único setor. Administrador de RH e Administrador de
Logística são dois registros de Cargo, cada um com seu setor e papel ADMINISTRADOR.
Não alterar o setor do cargo compartilhado para transferir só um funcionário:
selecione o cargo de destino na edição desse funcionário.

O nome do setor ou cargo não concede permissão. “Administrador” como nome de setor
não autoriza ninguém. O papel de acesso é configurado no cargo e vale para todos
os funcionários vinculados a ele. `is_staff` concede entrada no Django Admin,
mas não substitui a autorização de gestão do frontend.

## Preparar o ambiente

Na pasta backend, configure o `.env` local com a conexão PostgreSQL/Supabase usada
pela equipe, sem versionar credenciais. Com as dependências instaladas:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py showmigrations
python manage.py migrate --plan
python manage.py migrate
python manage.py runserver
```

Migrações são aplicadas uma vez por banco compartilhado, não por login ou por
integrante. Django registra as aplicadas em `django_migrations`. Novas migrações
devem ser revisadas e aplicadas pela equipe antes de usar o código correspondente.
`employees/0003_cargo_papel_acesso` foi aplicada no Supabase configurado nesta sessão.
Não é necessária migração adicional para perfil ou troca de senha.

Para o frontend, o `.env` local deve definir `VITE_API_URL` com a URL do backend
incluindo `/api`, por exemplo `http://localhost:8000/api`. Na pasta frontend,
execute `npm run dev`. Reinicie o Vite se alterar esse `.env`.

## Entrar no Django Admin

1. Com o backend iniciado na porta padrão, abra `http://localhost:8000/admin/`.
   Se usar outra porta ou servidor, use a URL correspondente do backend.
2. Entre com o usuário e senha do superusuário Django existente. Não use credenciais
   de acesso ao painel Supabase. O login do projeto usa contas Django no PostgreSQL.
3. Não é preciso criar um novo superusuário a cada execução. Se um banco novo ainda
   não tiver nenhum, execute `python manage.py createsuperuser` uma única vez.
4. Para redefinir a senha de uma conta conhecida pelo terminal, use
   `python manage.py changepassword NOME_DO_USUARIO`, com o backend apontando para
   o banco correto. Não coloque senhas diretamente em comandos ou documentação.

## Criar uma conta de funcionário

1. Cadastre o Setor e o Cargo pelo frontend ou Django Admin. No cargo, escolha
   o papel COMUM, GERENTE ou ADMINISTRADOR conforme a função autorizada.
2. Cadastre o Funcionário com seus dados e o cargo correto. Ele precisa estar ativo.
3. No Django Admin, em **ACCOUNTS → Usuários → Adicionar**, informe nome de usuário,
   senha e confirmação. Selecione o **Funcionário** no campo de vínculo e salve.
   O campo pode aparecer em “Funcionário” na criação e “Dados adicionais” na edição.
4. Na edição da conta, mantenha **Ativo** marcado. Uma conta comum de funcionário
   não precisa de **Equipe (staff)** nem **Superusuário** para entrar no frontend.
   Cada funcionário pode ter somente uma conta vinculada.
5. Saia da conta atual no frontend e entre com o novo nome de usuário e senha.
   Não é necessário reiniciar o backend depois de criar a conta.
6. Abra **Meu perfil** e confira Pessoa, Cargo e Setor. Para gestores, confirme os
   menus de Financeiro e Funcionários; para COMUM, esses menus não aparecem.

Se a conta de administrador não vê os menus, confira seu vínculo e o papel do
cargo; apenas nomear a conta, cargo ou setor “Administrador” não muda o papel.
Ao modificar permissões, volte à janela do frontend ou recarregue a aplicação.
A API consulta a permissão atual em cada requisição.

## Testar troca de senha e desligamento

Em **Meu perfil → Trocar senha**, informe a nova senha e confirmação e salve.
Após a mensagem de sucesso, saia e entre com a nova senha; a antiga será recusada.
Sem login, redefinição de senha é realizada pelo administrador Django, não por
uma rota pública. A troca de senha mantém JWTs existentes até sua expiração;
isso está detalhado em [autenticação frontend](autenticacao-frontend.md).

Desligar um funcionário exige data e motivo e preserva histórico. A conta vinculada
é desativada na mesma transação e perde acesso na próxima requisição. Não usar
funcionários reais para testar desligamento no banco compartilhado sem combinar
com a equipe. Os testes automatizados abaixo usam um banco isolado.

## Validação e referências

```powershell
# Na pasta backend, com venv ativo:
python manage.py test accounts employees --settings=stock.test_settings
# Na pasta frontend:
npm run build
npm run lint
```

Os testes verificam contratos, transações, acesso, perfil e senha. O SQLite em
memória não altera o Supabase. Build e lint possuem avisos preexistentes, sem erros.
Na entrega, os 22 testes de accounts e employees passaram, assim como build e lint.

Detalhes: [arquitetura de autenticação](arquitetura-autenticacao.md),
[integração de funcionários](funcionarios-integracao.md) e
[perfil e senha](autenticacao-frontend.md).
