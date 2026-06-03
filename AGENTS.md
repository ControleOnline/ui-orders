## UI Orders
- `OrderDetails` deve manter o atalho de anexos sempre visivel na barra do pedido e abrir o mini gerenciador de arquivos quando houver `orderId`.
- O gerenciador de anexos deve reaproveitar o padrao do upload de produtos, mas operar apenas com `order_file` e `files`.
- Nao tocar em `products`, `components` ou `product_group` para resolver anexos de pedido.
- Loadings e falhas do fluxo de anexos devem seguir `StateStore` e `MessageService`, sem banners paralelos.
