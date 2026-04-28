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
- A listagem de produtos dentro do pedido deve sair de um unico componente compartilhado entre `OrderDetails`, `POS` e visoes operacionais que mostrem itens do pedido. Diferencas entre telas entram apenas por acoes de contexto.
- O renderer compartilhado de itens deve agrupar filhos customizaveis pelos vinculos vindos do backend (`orderProduct`, `parentProduct` e `productGroup`). Nao criar mapeamento paralelo por tela para encaixar adicionais dentro do item pai.
- O carrinho/rascunho canonico da venda usa `orderType = cart`. `quote` nao deve mais ser usado como tipo de carrinho no fluxo ativo.
- Essa barra precisa existir em todos os devices que podem cobrar pedido.
- Nao criar fluxo paralelo de pagamento fora dessa barra.
- No checkout operacional, a barra deve mostrar primeiro os `payment_type` do device atual e abaixo os do device remoto principal configurado.
- O canal local/remoto nao aparece como etapa separada nessa barra; ele fica implicito na opcao escolhida e a explicacao detalhada so aparece ao tocar em `Pagar`.
- Os meios exibidos dependem do device dono de cada bloco e do gateway/carteiras configurados.
- Quando uma tela ja tiver barra propria de pagamento, o layout nao deve renderizar outra barra por baixo. Deve aparecer uma ou outra, nunca as duas.
- Rotas de `OrderDetails` e `Checkout` devem carregar o pedido por `id` na URL e pelo store; nao passar objeto do pedido em params.
- O contexto de `PDV` entre `OrderDetails` e `Checkout` deve permanecer em params primitivos, preservando `interactionMode` e `showBottomToolBar` para o checkout liberar o canal local correto.
- Entrada de valor no checkout operacional deve reaproveitar um unico componente compartilhado. Nao manter dois modais equivalentes para cobrar valor ou receber dinheiro.
- `Cielo` e `Infinite Pay` sao gateways atuais do fluxo operacional. Eles devem ser executados dentro do checkout unificado de `src/react/pages/checkout/Checkout.js`, sem telas paralelas por gateway.
- A execucao tecnica de cada gateway pode ficar em arquivos separados, como `services/Cielo/Checkout.js` e `services/InfinitePay/Checkout.js`, desde que ambos participem do mesmo fluxo unificado de checkout.
- Em `APP_TYPE=MANAGER`, mesmo na tela `PdvPage`, o checkout nao deve liberar pagamento local. O Gestor deve usar device remoto configurado ou pagamento na entrega.
- Quando existir equipamento padrao configurado para pagamento remoto, o checkout deve usar esse device como destino principal. Trocar de equipamento durante o pagamento so aparece se a empresa ativar essa permissao no configurador geral.
- No remoto e na entrega, o botao principal da barra executa o pagamento no equipamento atualmente selecionado. A troca de equipamento, quando permitida, aparece apenas como acao discreta ao lado do device atual, sem um segundo botao grande para a mesma finalidade.
- Itens do pedido com fila devem exibir na propria linha o status atual da fila com a cor da etapa corrente para indicar preparo.
- Itens customizaveis devem reabrir `CustomizeScreen` apenas enquanto o fluxo de producao do proprio item ainda nao chegou ao status final da fila (`realStatus = out`).
- Quando um item ja chegou ao fim da fila, a customizacao e a edicao inline daquele item devem ficar bloqueadas, mesmo que o pedido ainda esteja aberto.
- Componentes filhos agrupados nao devem receber edicao inline propria na lista do pedido. Quando precisarem mudar, a tela deve reabrir a customizacao do item pai e respeitar as regras de cada grupo.
- Em pedidos integrados, o identificador principal das telas operacionais deve priorizar o numero operacional curto vindo de `extraData` ou do payload canonico da integracao, como `order_index`, `code` ou `displayId`. `pickup_code` e `handover_code` ficam como fallback, e hashes ou ids tecnicos continuam apenas no summary.
- `OrderDetails` deve manter o summary como area de informacoes secundarias. As abas operacionais sao `Itens` e `Financeiro`, com invoices dentro de `Financeiro`.
- `OrderDetails` nao deve exibir o `BottomCart` global com acao `Conferir pedido`. Quando a tela estiver aberta, ela mesma controla a barra operacional necessaria e o layout deve manter `showBottomCart: false`.
- O numero principal do pedido nao deve ser repetido no topo da navegacao quando a propria tela ja abre com um cabecalho/resumo do pedido.
- `Total to charge` pertence a barra de finalizacao/pagamento do pedido. Descontos, pendencias e invoices pertencem ao bloco financeiro.
- Na tela principal de detalhe do pedido, a barra superior continua sendo o lugar do resumo de identificacao do pedido. O corpo da pagina deve comecar pelo bloco `Customer`.
- `Additional Information` nao deve poluir a tela principal do pedido. Informacoes secundarias e ids tecnicos ficam no summary/modal, nao acima do bloco de cliente.
- O detalhe do pedido deve abrir primeiro com `GET /orders/{id}`. A colecao `/order_products` entra apenas como enriquecimento da aba `Itens` quando o payload embutido vier ausente ou sem metadados suficientes para remontar a hierarquia de customizacao.
- Quando a aba `Itens` precisar buscar `/order_products`, ela deve reaproveitar o mesmo renderer compartilhado e trocar para o payload enriquecido sem criar normalizacao exclusiva de `OrderDetails`.
- Quando `OrderDetails` estiver editando quantidade de itens, o estado local e o merge otimista devem continuar baseados na colecao rica de `/order_products` sempre que ela ja existir. Nao sobrescrever essa colecao com o payload raso de `GET /orders/{id}`, senao os filhos customizaveis se soltam do item pai.
- Cada aba operacional de `OrderDetails` deve ser um componente proprio. `Itens` e `Financeiro` carregam os dados do proprio modulo apenas quando a aba correspondente for montada/ativada.
- O status visivel do pedido deve aparecer traduzido na tela e em summaries/modais. Nao exibir `open`, `pending`, `closed` ou equivalentes crus para o usuario final.

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
- Pagamento remoto deve filtrar os meios pelo `payment_code`. O bloco remoto da barra deve listar apenas `payment_type` que tenham `payment_code`, porque isso identifica os meios integrados que o hardware do PDV remoto consegue executar no proprio device.
- Nao remover item do bloco remoto por ser `dinheiro` ou por classificacao visual semelhante; a regra canonica aqui e ter ou nao `payment_code`.
- Hoje isso acontece pelos modulos React Native nativos de `Cielo` e `Infinite Pay`, que expõem intents/acoes nativas de pagamento.
- Esses intents existem apenas no hardware do PDV que tem o modulo embarcado; nenhum outro device ou navegador consegue executar esse pagamento localmente em nome dele.
- Exemplo atual: somente o PDV com Cielo consegue acionar o modulo Cielo embarcado; o checkout web apenas envia a solicitacao e aguarda a resposta do equipamento remoto.
- Se houver mais de um device remoto disponivel, o usuario precisa poder escolher qual equipamento recebera a cobranca.
- No checkout web/manager, o operador escolhe antes no proprio web o meio de pagamento permitido pelas carteiras do equipamento remoto selecionado.
- O listener remoto deve apenas executar o mesmo helper tecnico usado pelo checkout unificado. Nao renderizar checkout especifico de Cielo ou Infinite Pay para isso.
- Se `order-payment-devices` estiver preenchido no configurador geral, ele define a ordem global e tem prioridade no checkout remoto.
- `order-payment-device` fica como fallback por origem quando a empresa nao definiu `order-payment-devices`.
- Se nenhum dos dois estiver preenchido, o checkout remoto deve cair para os devices de pagamento da empresa, excluindo o device atual.
- O botao principal de pagar no canal remoto deve deixar claro qual equipamento configurado recebera a cobranca.
- Depois de enviar a cobranca remota, o checkout do web deve permanecer aguardando a resposta do equipamento remoto antes de concluir a tela.

## Regras operacionais de POS e kiosk
- Nao existe `APP_TYPE=TOTEM`. O totem e sempre `APP_TYPE=POS` com `pos-operation-mode=kiosk`.
- Em `BALCAO`, a entrada do app deve continuar em `HomePage`. O fluxo continuo de retomada so comeca a partir de `OrderHistoryPage`, nunca pulando a home como no `kiosk`.
- Em `BALCAO`, quando a lista de pedidos for aberta em modo de retomada, vale a prioridade de foco unico: sem pedido aberto vai para `AddProductScreen`; com um pedido aberto vai direto para ele; com mais de um pedido aberto permanece em `OrderHistoryPage` para escolha explicita.
- Em `BALCAO`, quando o operador pedir um novo pedido a partir do historico, o fluxo nao deve reabrir automaticamente o rascunho salvo anterior; ele precisa limpar a referencia ativa para materializar um novo `cart` no proximo item adicionado.
- Em `BALCAO`, depois de concluir o pagamento de um pedido, o proximo destino depende dos pedidos abertos restantes no device: mais de um volta ao historico, um volta direto ao pedido restante, nenhum volta ao catalogo.
- Em `BALCAO`, quando a configuracao do device exigir abertura e fechamento de caixa, `HomePage`, `AddProductScreen` e atalhos de inicio de venda nao podem liberar o catalogo com o caixa fechado; nesses casos o fluxo deve redirecionar para `CloseCashRegister`.
- No `kiosk`, o cliente entra direto no fluxo de compra e nao deve passar por abertura/fechamento de caixa nem por telas administrativas do PDV.
- Em `kiosk`, `OrderDetails` nao deve mostrar blocos de cliente, endereco, observacoes, sumario ou logs. Logs e summary so podem reaparecer quando o device estiver com `device-runtime-debug-info-enabled`.
- Em `kiosk`, a faixa operacional de preparo/cancelamento nao deve aparecer junto da barra de pagamento. Quando a propria tela tiver barra operacional propria, o layout nao deve reservar outra barra por baixo.
- Atendimento vinculado por `tab` e `table` deve usar esses nomes canonicos em codigo, configuracoes e metadados internos. Traducao vale apenas para labels visuais.
- Nao criar sinonimos, aliases ou fallbacks paralelos para tipos, chaves de configuracao ou metadados de `tab/table`. O contrato interno deve ter um unico nome por conceito.
- As regras operacionais de `tab/table`, identificacao, leitura e vinculo valem para qualquer superficie de `PDV` renderizada por `ui-orders`, inclusive quando a `PdvPage` estiver hospedada dentro de `APP_TYPE=MANAGER`.
- O fluxo cliente-facing de `SHOP` nao reutiliza essas regras operacionais de `PDV` para `tab/table`.
- A configuracao `check-order-management-mode` define se o `POS` pode abrir e fechar `tab/table` ou se ele apenas pode operar sobre `tab/table` que ja estejam abertas.
- A identificacao operacional de `tab/table` deve aceitar digitacao manual e leitura por leitor de codigo de barras. Em runtime nativo, a mesma entrada pode expor tambem QR Code e NFC quando o device suportar esses leitores.
- A conciliacao financeira de `tab/table` deve sempre usar o pedido raiz de settlement como referencia de checkout. Nao criar checkout paralelo por pedido filho.
- Quando mais de uma `tab/table` for vinculada na mesma conciliacao, a secundaria passa a apontar para a principal e as invoices historicas tambem precisam ficar visiveis no pedido raiz.
- Fluxos administrativos de liquidacao, consolidacao ou pagamento de `tab/table` no `MANAGER` nao devem herdar a restricao operacional do `POS`; eles podem abrir, vincular, consolidar e fechar `tab/table`.
- A leitura de codigo de barras por wedge de teclado pode ficar ativa em qualquer tela de contexto `POS`/`PDV`, inclusive dentro de `OrderDetails` e do `PDV` hospedado no `MANAGER`.
- Quando um bip ou a selecao de um produto pelo auto-complete precisar materializar um pedido inexistente, o fluxo deve criar apenas um pedido e reutilizar a mesma promise de criacao concorrente.
- Fora da conferencia, bip e atalho de auto-complete podem levar o usuario para `OrderDetails` apos adicionar o item. Dentro de `OrderDetails`, novos bipes devem continuar adicionando itens sem sair da tela.
- `OrderDetails` em contexto `PDV` pode pesquisar e adicionar produto diretamente na aba `Itens`, sem sair da conferencia.
- A pesquisa de produtos com auto-complete e a leitura de codigo de barras fazem parte do fluxo operacional de `POS`, nao apenas do `kiosk`.

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
