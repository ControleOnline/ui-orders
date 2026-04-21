## Escopo
- `ui-orders` e o modulo fonte do checkout de pedidos de venda e da barra unica de pagamento operacional.
- A referencia principal da cobranca fica em `src/react/pages/checkout/Checkout.js`.
- As regras compartilhadas de device, gateway e configuracao ficam em `@controleonline/ui-common/src/react/utils/paymentDevices`.
- O `ui-shop` consome as mesmas regras de empresa para pagamento online e pagamento na entrega.

## Estado
- Este modulo tem implementacao ativa em `src/react` e deve constar em novos prompts.
- Se existir `src/vue`, ela deve ser tratada como legado e ignorada, salvo pedido explicito.

## Regra central
- Todo pedido de venda deve ser pago pela barra unica de pagamento do sistema.
- Essa barra precisa existir em todos os devices que podem cobrar pedido.
- Nao criar fluxo paralelo de pagamento fora dessa barra.
- Primeiro o usuario escolhe onde a cobranca vai acontecer. Depois escolhe o meio de pagamento.
- Os meios exibidos dependem do canal selecionado e do device/gateway configurado.

## Regras por visao
- `PDV Cielo`: cobra somente no proprio device. Nao deve oferecer remoto nem pagamento na entrega nesse fluxo.
- `PDV Android`: pode cobrar no proprio device, enviar a cobranca para uma maquina remota ou marcar para cobrar na entrega.
- `MANAGER`: nao deve cobrar localmente. Deve escolher um device remoto, como Cielo ou Infinite Pay, ou cobrar na entrega.
- `SHOP`: o cliente deve escolher pagamento online ou pagamento na entrega. Online hoje significa Asaas. Na entrega, o shop so mostra as opcoes liberadas pela empresa.

## Pagamento remoto
- Pagamento remoto sempre depende de um device de destino configurado na empresa.
- Os destinos remotos validos para orders sao devices com gateway de pagamento, hoje Cielo e Infinite Pay.
- Se houver mais de um device remoto disponivel, o usuario precisa poder escolher qual equipamento recebera a cobranca.

## Pagar Na Entrega
- `Pagar na entrega` sempre exige selecionar qual device fara a cobranca.
- O device escolhido na entrega define o que a barra mostra ao cliente, como maquininha e dinheiro.
- Em dinheiro, o fluxo precisa pedir a informacao de troco antes de concluir a escolha.
- No checkout operacional, registrar a cobranca como pendente com os metadados do device de entrega.
- No `SHOP`, o cliente escolhe entre pagar online agora ou pagar na entrega com as opcoes liberadas para a empresa.

## Configuracao
- A barra unica depende das configuracoes centralizadas de empresa e device.
- Chaves centrais atuais: `pos-gateway`, `order-payment-device`, `order-payment-devices` e `order-charge-on-delivery-enabled`.
- Carteiras por gateway e dinheiro devem continuar centralizadas na configuracao da empresa, nao espalhadas em componentes.
- Ao mudar qualquer regra de negocio do checkout, reescrever este arquivo de forma concisa e manter a descricao sincronizada com o codigo.
