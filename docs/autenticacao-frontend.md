# Autenticação — frontend

Criação e vínculo de contas ficam no Django Admin, usando o superusuário existente.

Perfil e troca direta de senha estão integrados ao backend. A recuperação pública
por e-mail/código foi retirada.

`POST /api/contas/senha` exige JWT de uma conta ativa e recebe `nova_senha` e
`confirmacao` (8 a 128 caracteres). Confere a confirmação e aplica os validadores
de senha configurados no Django, incluindo senhas comuns, numéricas e semelhantes
aos dados da conta. Usa `set_password` e retorna 204. Erros de validação retornam
422 e não alteram a senha; contas desligadas ou requisições anônimas recebem 401.
Não recebe ID, e-mail ou nome de outro usuário. Não exige senha atual nem código
por e-mail, conforme o fluxo direto acordado. A tela mostra sucesso somente após
a API confirmar o salvamento e limpa os campos de senha.

A senha antiga deixa de funcionar no login. Esta operação não revoga os JWTs
já emitidos com a configuração atual; a sessão do frontend permanece aberta.
Sessões Django são invalidadas pela mudança do hash de senha. Não existe endpoint
público para redefinir senha sem autenticação. Não é necessária nova migração.

`GET /api/contas/me` retorna os campos da conta e `funcionario`, com `id`,
`pessoa` (dados pessoais e endereço) e `cargo` (incluindo setor). Para contas sem
vínculo, `funcionario` é nulo. O endpoint usa a identidade autenticada e não recebe
um identificador de outro usuário. Não retorna salário ou dados bancários.

Ao abrir `/perfil`, a tela consulta novamente esse endpoint. Nome, e-mail,
telefone, CPF, nascimento e endereço vêm do cadastro do funcionário vinculado.
Cargo e setor também são exibidos.
O menu superior mostra o nome do cargo vinculado, com fallback para o papel de
acesso; contas sem vínculo mostram Administrador quando autorizadas à gestão,
ou Usuário. O rótulo não é fixo e não concede permissão.
Contas sem vínculo usam nome e e-mail da conta Django e mostram os campos ausentes
como não informados. O perfil é somente
consulta; alterações continuam sendo realizadas no cadastro de funcionários.
Não foi necessária nova migração para ampliar essa resposta.

O vínculo da conta com o funcionário e o bloqueio após desligamento estão
documentados em [arquitetura-autenticacao.md](arquitetura-autenticacao.md).
