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
- Quando uma tela ja tiver barra propria de pagamento, o layout nao deve renderizar outra barra por baixo. Deve aparecer uma ou outra, nunca as duas.
- Rotas de `OrderDetails` e `Checkout` devem carregar o pedido por `id` na URL e pelo store; nao passar objeto do pedido em params.
- O contexto de `PDV` entre `OrderDetails` e `Checkout` deve permanecer em params primitivos, preservando `interactionMode` e `showBottomToolBar` para o checkout liberar o canal local correto.
- Entrada de valor no checkout operacional deve reaproveitar um unico componente compartilhado. Nao manter dois modais equivalentes para cobrar valor ou receber dinheiro.
- `Cielo` e `Infinite Pay` sao gateways atuais do fluxo operacional. Eles devem ser executados dentro do checkout unificado de `src/react/pages/checkout/Checkout.js`, sem telas paralelas por gateway.
- A execucao tecnica de cada gateway pode ficar em arquivos separados, como `services/Cielo/Checkout.js` e `services/InfinitePay/Checkout.js`, desde que ambos participem do mesmo fluxo unificado de checkout.
- Em `APP_TYPE=MANAGER`, mesmo na tela `PdvPage`, o checkout nao deve liberar pagamento local. O Gestor deve usar device remoto configurado ou pagamento na entrega.
- Quando existir equipamento padrao configurado para pagamento remoto, o checkout deve usar esse device como destino principal. Trocar de equipamento durante o pagamento so aparece se a empresa ativar essa permissao no configurador geral.
- No remoto e na entrega, o botao principal da barra executa o pagamento no equipamento atualmente selecionado. A troca de equipamento, quando permitida, aparece apenas como acao discreta ao lado do device atual, sem um segundo botao grande para a mesma finalidade.

## Regras por visao
- `PDV Cielo`: cobra somente no proprio device. Nao deve oferecer remoto nem pagamento na entrega nesse fluxo.
- `PDV Android`: pode cobrar no proprio device, enviar a cobranca para uma maquina remota ou marcar para cobrar na entrega.
- `MANAGER`: nao deve cobrar localmente. Deve escolher um device remoto, como Cielo ou Infinite Pay, ou cobrar na entrega.
- `SHOP`: o cliente deve escolher pagamento online ou pagamento na entrega. Online hoje significa Asaas. Na entrega, o shop so mostra as opcoes liberadas pela empresa.
- Dinheiro em fluxo operacional pertence a `PDV` e `MANAGER`, sempre comandado por funcionario. O `SHOP` nao confirma pagamento em dinheiro aqui.
- Em modo `PDV` no web, o pagamento local em dinheiro continua valido. Ao escolher dinheiro e tocar em pagar, a tela deve pedir o valor recebido e mostrar o troco antes da confirmacao.

## Pagamento remoto
- Pagamento remoto sempre depende de um device de destino configurado na empresa.
- Os destinos remotos validos para orders sao apenas PDVs com gateway de pagamento, hoje Cielo e Infinite Pay.
- Se houver mais de um device remoto disponivel, o usuario precisa poder escolher qual equipamento recebera a cobranca.
- No checkout web/manager, o operador escolhe antes no proprio web o meio de pagamento permitido pelas carteiras do equipamento remoto selecionado.
- Quando o meio selecionado nao depende de gateway, como dinheiro, a conclusao continua sendo responsabilidade do device remoto escolhido e o helper compartilhado deve registrar a invoice no fim do fluxo.
- O listener remoto deve apenas executar o mesmo helper tecnico usado pelo checkout unificado. Nao renderizar checkout especifico de Cielo ou Infinite Pay para isso.
- Se `order-payment-devices` estiver preenchido no configurador geral, ele define a ordem global e tem prioridade no checkout remoto.
- `order-payment-device` fica como fallback por origem quando a empresa nao definiu `order-payment-devices`.
- Se nenhum dos dois estiver preenchido, o checkout remoto deve cair para os devices de pagamento da empresa, excluindo o device atual.
- O botao principal de pagar no canal remoto deve deixar claro qual equipamento configurado recebera a cobranca.
- Depois de enviar a cobranca remota, o checkout do web deve permanecer aguardando a resposta do equipamento remoto antes de concluir a tela.

## Pagar Na Entrega
- `Pagar na entrega` sempre exige selecionar qual device fara a cobranca.
- O device escolhido na entrega define o que a barra mostra ao cliente, como maquininha e dinheiro.
- Em dinheiro, o fluxo precisa pedir a informacao de troco antes de concluir a escolha.
- No checkout operacional, registrar a cobranca como pendente com os metadados do device de entrega.
- No `SHOP`, o cliente escolhe entre pagar online agora ou pagar na entrega com as opcoes liberadas para a empresa.
- Quando um pedido do `SHOP` for marcado para dinheiro na entrega, a confirmacao final do valor pago acontece depois por um funcionario em `PDV` ou `MANAGER`.

## Configuracao
- A barra unica depende das configuracoes centralizadas de empresa e device.
- Chaves centrais atuais: `pos-gateway`, `order-payment-device`, `order-payment-devices`, `order-payment-device-change-allowed` e `order-charge-on-delivery-enabled`.
- Carteiras por gateway e dinheiro devem continuar centralizadas na configuracao da empresa, nao espalhadas em componentes.
- Ao mudar qualquer regra de negocio do checkout, reescrever este arquivo de forma concisa e manter a descricao sincronizada com o codigo.
