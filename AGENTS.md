## Ponto de entrada

- A documentação funcional e de regras deste modulo vive na wiki do proprio repositório e na wiki principal do app.
- Regras transversais de qualidade, modularizacao e limites de componente vivem em `https://github.com/ControleOnline/agents-mcp/blob/master/skills/shared/code-quality.md`.
- Quando houver detalhe especifico de implementacao, prefira comentar no codigo em ingles perto da regra.
- Este arquivo deve ficar curto e servir apenas como ponte para as fontes oficiais.

## Documentação (navegação humana)

Comece pela Home da wiki do módulo e use a cópia versionada no Git quando precisar do fallback deste repositório.

| Categoria | Destino |
| --- | --- |
| Home do módulo | https://github.com/ControleOnline/ui-orders/wiki |
| Wiki principal do app | https://github.com/ControleOnline/app-community/wiki |
| Visões do app (`APP_TYPE`) | https://github.com/ControleOnline/app-community/blob/master/MODOS_OPERACAO.md |

### Por categoria — fluxos de negócio e settlement

| Página | O que documenta |
| --- | --- |
| [LinkedOrderSettlement — Mesa com múltiplas comandas](https://github.com/ControleOnline/ui-orders/wiki/LinkedOrderSettlement-Mesa-Comandas) | Árvore mesa→comandas→carts/sales; `listLinkedTabsUnderRoot`; smoke flowchart 1 (`#605`) |
| [Waiter POS Charge](https://github.com/ControleOnline/ui-orders/wiki/Waiter-POS-Charge) | Nó `waiterPosCharge` (flowchart #1): cobrança no POS após Ready + fechamento da mesa (`#606`, `fluxo: financeiro-cobranca`) |
| [Order History — Criar fatura](https://github.com/ControleOnline/ui-orders/wiki/OrderHistory-Criar-Fatura) | Botão/modal criar fatura no histórico (`#329`) |

### Por categoria — operação e automação do repositório

| Página | O que documenta |
| --- | --- |
| [`docs/technical/Automacao-Technical-Documenter-Push-Master.md`](docs/technical/Automacao-Technical-Documenter-Push-Master.md) | Fluxo Manager Worker + composite technical-documenter (substitui workflow legado standalone) |

### Módulos relacionados

| Módulo | Entrada |
| --- | --- |
| `agents-mcp` | https://github.com/ControleOnline/agents-mcp |
| `app-community` | https://github.com/ControleOnline/app-community/wiki |
