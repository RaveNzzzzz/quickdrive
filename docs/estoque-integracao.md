# Integração do estoque

A tela segue o padrão do pátio: cliente `api` com JWT e renovação de token,
`Modal` compartilhado, estados de carregamento/erro, respostas persistidas para
atualizar a tela e avisos temporários de sucesso.

## Contrato atual

- GET /estoque/produtos, /estoque/categorias e /estoque/lotes retornam listas sem paginação.
- POST e PATCH cadastram/editam produtos, categorias e lotes.
- DELETE remove produtos e lotes; vínculos protegidos retornam 409 e são exibidos no modal.
- Não existe DELETE de categoria; a interface oferece cadastro e edição.
- Produto contém nome, especificação e categoria. Quantidade e validade pertencem ao lote.
- O saldo de um produto é a soma das quantidades dos seus lotes, incluindo lotes sem validade.
- Produto sem lote tem saldo zero. O indicador de estoque baixo usa o limite atual de 3 unidades.
- Cadastro de produto e lote são operações separadas, evitando repetir o cadastro do produto se um lote falhar.

## Dependência de compras

O backend atual não contém compra/item de compra nem custo em Produto ou Lote.
Por isso valor unitário e valor total ficam indisponíveis, sem simular custo zero
ou solicitar um preço manual sem origem financeira.

Antes da próxima integração, alinhar com o responsável por compras:

1. Relação entre item de compra, produto e lote e quantidade originalmente comprada.
2. Custo unitário de aquisição, descontos, frete e demais custos incluídos.
3. Tratamento de estornos, devoluções e quantidade restante.
4. Regra de avaliação: custo por lote, média ponderada ou outra regra aprovada pelo time.
5. Campos/endpoint do backend para disponibilizar os custos e indicar ausência de dados.

Se a regra for custo por lote, o total será a soma de quantidade restante vezes
custo unitário de cada lote. Não calcular média simples de preços de compras nem
escolher automaticamente o preço da compra mais recente. Lotes sem custo precisam
ser identificados para que um total parcial não pareça representar todo o estoque.
A agregação financeira deve ser definida pelo backend com precisão decimal.

## Verificação manual com sessão autenticada

- Abrir estoque vazio; criar categoria, produto e dois lotes; conferir saldo agregado.
- Editar quantidade, número e validade do lote; limpar validade; conferir atualização do saldo.
- Buscar por produto, especificação e número de lote; filtrar categoria e estoque baixo.
- Tentar repetir número do lote no mesmo produto; conferir mensagem de conflito.
- Tentar excluir produto com lote; conferir bloqueio 409.
- Cancelar exclusão; excluir lote e conferir saldo; excluir produto sem vínculos.
- Simular falha no carregamento e usar Tentar novamente.
- Conferir que custos permanecem indisponíveis e não aparecem como R$ 0,00.

Testes automatizados da agregação (Node 22.6+):
`node --experimental-strip-types --test frontend/tests/estoque.test.mjs`

Validação realizada: testes de agregação aprovados e build do frontend aprovado.
O lint não encontrou erros; apresentou avisos em componentes preexistentes.
A validação do backend e do fluxo autenticado depende de instalar Django no
ambiente virtual local. Não foram feitas alterações de banco ou migrações.
