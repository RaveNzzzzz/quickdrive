# Integração de funcionários

A tela `/funcionarios` consulta o backend autenticado pelo cliente HTTP comum do
frontend. Não utiliza funcionários fictícios. A busca global também consulta a API.

## Operações

| Ação | Endpoint |
| --- | --- |
| Listar ativos e inativos | `GET /api/funcionarios?ativo=true` e `?ativo=false` |
| Consultar opções do formulário | `GET /api/cargos` e `GET /api/setores` |
| Cadastrar | `POST /api/funcionarios` |
| Editar funcionário ativo | `PATCH /api/funcionarios/{id}` |
| Desligar | `POST /api/funcionarios/{id}/desligar` |

A leitura percorre a paginação `items/count` com `limit/offset`. Filtros, indicadores
e paginação visual usam os registros carregados; a folha soma salários dos ativos,
sem estimar comissões. Falhas mostram mensagem e opção de tentar novamente.

O formulário reúne Pessoa física, endereço, cargo, remuneração, admissão,
expediente, regime de contratação e dados bancários. As opções de cargo e setor
vêm do banco; precisam existir antes do cadastro.
O formulário possui seletores separados de Setor e Cargo. Selecionar um setor
filtra os cargos disponíveis; mudar de setor limpa o cargo selecionado. Na edição,
ambos vêm preenchidos. A API recebe `cargo_id` e obtém o setor pelo vínculo do cargo,
sem duplicar a relação no funcionário.
CPF, telefone e CEP são enviados apenas com dígitos. O backend continua responsável
pela validação e pelas transações.
CPF exige 11 dígitos e unicidade, sem conferir dígitos verificadores. Essa regra
fica no modelo compartilhado Pessoa e vale também para outras pessoas físicas.
Erros de campos retornados pela API aparecem no modal, mantendo os dados digitados.

Desligar substitui a exclusão: exige data e motivo, preserva o registro e permite
consultar seu histórico na lista de inativos. O backend desativa a conta vinculada
na mesma transação, conforme [arquitetura de autenticação](arquitetura-autenticacao.md).

Cadastrar funcionário não cria automaticamente credenciais de login. O vínculo
entre User e Funcionario continua administrado pelo Django Admin. A autorização
por cargo usa `Cargo.papel_acesso`: GERENTE e ADMINISTRADOR, além do superusuário,
podem gerenciar funcionários, cargos e setores. COMUM recebe 403 nesses endpoints.

## Cargos e setores

Os botões “Ver cargos” e “Ver setores” abrem `/funcionarios/cargos` e
`/funcionarios/setores`. As telas permitem buscar, cadastrar e editar usando
`GET`, `POST` e `PATCH` dos endpoints existentes. Cargo exige nome e setor;
descrição é opcional. Setor exige nome. A contagem de funcionários considera
somente ativos e usa os registros da API. O formulário de cargo define também seu
papel de acesso. Consulte a arquitetura de autenticação para aplicar a migração
e configurar os cargos existentes.
As telas permanecem separadas, mostrando os vínculos do banco: Cargos apresenta
nome, setor, papel de acesso e total de funcionários ativos; Setores apresenta
nome, nomes dos cargos vinculados e total de funcionários ativos. Setores sem
cargos mostram “Nenhum cargo cadastrado”. Cada cargo pertence a um único setor.

## Verificação das telas

Na pasta `frontend`: `npm run build` e `npm run lint`.
Na pasta `backend`, com o venv ativo:
`python manage.py test accounts employees stock --settings=stock.test_settings`.
Esses testes usam SQLite em memória e não alteram o Supabase compartilhado.
