### ### ### ### ### ##### ### ### ### ### ###
### ### ### ENTENDIMENTO ALINHADO ### ### ###
### ### ### ### ### ##### ### ### ### ### ###

No `app-community`, cor hardcoded é qualquer cor ou transparência definida diretamente no código, em vez de vir do tema oficial.

Isso inclui:
- `#HEX`, `rgb(...)`, `rgba(...)`
- `'white'`, `'black'`, `'transparent'`
- opacidades e transparências visuais fixas no componente
- qualquer variação visual decidida localmente no arquivo

A regra correta é:
- As cores devem vir somente do tema atrelado ao `DOMAIN`
- A fonte oficial desse tema é o fluxo do `DOMAIN -> PeopleDomain -> Theme -> theme.colors -> /themes-colors.css`
- No frontend, a referência correta é o tema carregado desse domínio e colocado no store `theme.colors`
- A base persistida desse tema para este trabalho deve ser registrada no arquivo `themes-actual.md`

E a restrição mais importante:
- Não usar `mainCompany.theme`
- Não usar `currentCompany.theme`
- Não usar `colors.js` como atalho de tema, inclusive aliases como `colors.white`, `colors.black` ou semelhantes
- Se a cor vier de um arquivo local de cores e não do tema do `DOMAIN`, ela continua sendo hardcoded para este fluxo
- Mesmo que existam no código hoje, eles não devem ser tratados como fonte correta de cor
- Excecao unica permitida: `app-community/modules/controleonline/ui-manager/src/react/pages/ThemeManagerPage.js`
- Nessa tela, cores hardcoded sao obrigatorias e permitidas
- Motivo: ela existe para manipular e visualizar cores manualmente sem depender do proprio tema em edicao, evitando perder visibilidade das cores durante o ajuste
- Nunca mexer no layout
- Nunca mexer no backend
- Quando existir estrutura de arquivo pai/filho para cores locais do módulo, não resolver isso agora no fluxo normal
- Esses casos devem ser registrados separadamente como `PAI/FILHO`, para tratamento posterior
- O objetivo futuro nesses casos é fazer com que os arquivos filhos deixem de depender de cores registradas nos arquivos pais, de modo que essas referências locais possam ser descartadas ao final

Definição importante para este trabalho:
- variável é o nome que usamos para nos referir a uma cor
- conteúdo é a cor que está dentro da variável

Exemplo:
- `background=white` significa que a variável se chama `background` e que o conteúdo dela é `white`

Então, resumindo em uma frase:
- Valor visual de cor ou transparência só é válido se vier do tema do `DOMAIN`; se estiver literal no arquivo ou vier de `mainCompany/currentCompany`, está errado.

### ### ### ### #### #### ### ### ### ###
### ### ### FLUXO DE TRABALHO ### ### ###
### ### ### ### #### #### ### ### ### ###

### LEVANTAMENTO
# não executar o item 1
#1. Primeiro vamos ler exclusivamente o tema do `DOMAIN` e registrar no arquivo `themes-actual.md`:
#- nome da variável
#- valor atual

2. Depois vamos varrer `app-community` módulo por módulo e arquivo por arquivo.

3. Para cada cor/transparência fora da regra do `themes.md`, vamos gravar no arquivo themes-todo.md
- no levantamento do `themes-todo.md`, bastam duas informacoes: `modulo` e `arquivo`
- nao precisa registrar linha no `themes-todo.md`

4. Sempre que encontrarmos arquivo de imagem, logo, ícone ou outro asset visual, em qualquer formato, usado de forma hardcoded no módulo:
- registrar no arquivo `images-todo.md`
- anotar o caminho do arquivo
- anotar onde ele está sendo usado
- anotar se parece ser asset de marca, asset funcional ou asset decorativo
- se houver dúvida sobre tratamento, deixar isso explícito no registro

5. Depois que terminar, revise novamente para ver se não ficou nada para trás.

6. Sempre que registrar conteudo em `themes-actual.md` ou `themes-todo.md`:
- manter a mesma tabulacao visual para facilitar comparacao
- em `themes-actual.md`, alinhar nome da variavel e conteudo na mesma linha

### EXECUÇÃO
1. Para cada registro no themes-todo.md em MÓDULOS / ARQUIVOS HARDCODED:

2. Se existir no `themes-actual.md` a variável com o mesmo nome:
- a comparação deve ser feita pelo nome da variável, e não pelo conteúdo
- removemos do arquivo o conteúdo hardcoded
- substituímos a origem do valor pela variável oficial do tema do `DOMAIN`
- não trocar por alias local de cores como `colors.white`
- no código, o objeto de acesso deve ser `theme`, e o uso deve seguir `theme.<token>`
- o objetivo é manter o mesmo papel visual, mas trocar a fonte do valor para o tema carregado do `DOMAIN`

exemplo:
    em themes-actual.md: pageBackground=white
    no arquivo: background=white

    substituir no código para algo equivalente a:
    background = theme.colors.pageBackground

3. Se no arquivo existir uma variável local com nome ruim, mas que claramente representa um token do tema:
- além de trocar o valor, vamos renomear a variável para o nome canônico do tema
exemplo:
    em themes-actual.md: pageBackground=white
    no arquivo: xpto=white
    substituir no código para algo equivalente a:
    pageBackground = theme.colors.pageBackground

4. Se houver um valor hardcoded mas o contexto não for claro o suficiente para mapear com segurança:
- não corrigimos no escuro
- registramos em um bloco de `pendente`

5. Se existir uma necessidade visual real no código e não houver variável correspondente no tema do banco:
- criamos uma nova variável de tema num arquivo "themes-new.md" (que deve ter o theme local + os novos, para ficar fácil de acompanharmos as mudanças)
- não registramos essa nova variável no `themes-actual.md` antes de ela existir no tema oficial
- essa nova variável precisa ser um token semântico do tema, não um apelido técnico de arquivo local
- e depois usamos essa variável no código

6. O `themes-todo.md` vira o rastreador operacional:
- o que está hardcoded
- o que foi corrigido
- o que ficou pendente
- e o que precisou nascer como novo token de tema
- no bloco de levantamento do `themes-todo.md`, registrar somente `modulo` e `arquivo`

7. Quando uma correção for feita e registrada no bloco de corrigidos:
- ser bem objetivo
- informar o nome do arquivo
- informar a linha
- mostrar o antes
- mostrar o depois

8. Para deixar muito claro o que foi feito, também registrar cada correção em `depara.md`:
- módulo / arquivo / linha
- antigo: variável, conteúdo, cor
- novo: variável, conteúdo, cor

9. A rotina de trabalho deve manter `depara.md` atualizado a cada troca:
- sempre que um hardcoded for substituído, registrar a troca no momento da correção
- não deixar para preencher depois
- o arquivo `depara.md` deve acompanhar o ritmo do `themes-todo.md` e do bloco de corrigidos

exemplo:
    arquivo: src/react/pages/exemplo/index.js
    linha: 120
    antes: backgroundColor: '#fff'
    depois: backgroundColor: theme.colors.pageBackground

### NOTA TÉCNICA
Quando um estilo precisar usar a cor de fundo principal da tela, a implementação correta deve apontar para o tema carregado no store, e não para um valor literal.

Exemplo de referência:
```js
import {StyleSheet} from 'react-native';
import {useStore} from '@store';

const themeStore = useStore('theme');
const {colors} = themeStore.getters;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.pageBackground,
  },
});
```

Padronização de nomes:
- `themeStore` deve ser a referência ao store de tema
- `themeColors` deve ser o objeto bruto vindo de `themeStore.getters.colors`
- `palette` deve ser o mapa local usado pelo componente para acessar as cores
- as chaves da `palette` devem repetir os nomes canônicos do tema, por exemplo `pageBackground`, `cardBackground`, `textPrimary`
- o uso no style deve seguir `palette.<token>` ou `colors.<token>` quando o arquivo trabalhar direto com o store
- esse padrão deve ser seguido em todos os arquivos novos ou ajustados, tomando `Profile.js` como referência de estrutura

Interpretação técnica:
- `backgroundColor` não deve receber `#HEX`, `white`, `rgba(...)` ou qualquer outro valor hardcoded
- o valor deve vir de `themeStore.getters.colors.<tokenCanonico>`
- para isso, o arquivo precisa importar `useStore` e declarar o acesso ao `themeStore` antes de montar o style
- o token deve ser usado de forma direta, sem fallback, sem alias alternativo e sem tentativa de "adivinhar" outra cor
- não usar `tokens base` genéricos
- usar sempre os nomes canônicos definidos em `themes-map.md`, conforme o objeto visual real
- exemplo correto: `backgroundColor: colors.pageBackground`
- exemplo incorreto: `backgroundColor: colors.pageBackground || colors.primary || '#FFFFFF'`
- a mesma regra vale para qualquer outro papel visual, por exemplo:
  `buttonBackground -> themeStore.getters.colors.buttonBackground`
  `cardBackground -> themeStore.getters.colors.cardBackground`
  `inputBackground -> themeStore.getters.colors.inputBackground`
  `textSecondary -> themeStore.getters.colors.textSecondary`
- isso cria uma dependência direta entre o componente e o tema ativo
- com isso, o fundo da tela passa a responder ao tema carregado para o `DOMAIN`, sem precisar alterar o código da tela
- esse é o comportamento esperado para qualquer token semântico equivalente, não apenas `background`
