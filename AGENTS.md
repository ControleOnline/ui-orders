## UI Orders
- `OrderDetails` deve manter o atalho de anexos sempre visivel na barra do pedido e abrir o mini gerenciador de arquivos quando houver `orderId`.
- O gerenciador de anexos deve reaproveitar o padrao do upload de produtos, mas operar apenas com `order_file` e `files`.
- Nao tocar em `products`, `components` ou `product_group` para resolver anexos de pedido.
- Loadings e falhas do fluxo de anexos devem seguir `StateStore` e `MessageService`, sem banners paralelos.
- A tela de compras e evidencias da engenharia deve ficar em `ui-orders`, carregar pedidos com `orderType=purchase`, usar `OrderHeader` no resumo e abrir o mini gerenciador de anexos para evidencias.
- Essa tela deve paginar com carregamento infinito e buscar os detalhes e anexos via `orders`, `order_file` e `files`, sem usar o seed JSON da engenharia.
- O modo `single-item` do PDV tambem pertence a este modulo: o carrinho deve manter apenas um produto raiz por pedido, a troca precisa usar `PUT /orders/{id}/replace-products` e o fluxo final deve voltar para `OrderHistoryPage`.
- Mudancas nesse fluxo devem vir acompanhadas de cobertura em browser em `src/tests/browser`, validando a troca de produto e a saida para a lista de pedidos apos o pagamento.
