### ### ### MAPA DE TEMA ### ### ###

Objetivo:
- centralizar os nomes canônicos dos tokens de cor
- evitar prefixos por modulo ou tela
- servir como referencia para o codigo, `themes-new.md` e `themes-todo.md`

Regras:
- usar apenas nomes semanticos globais
- nao usar `colors.js` como origem final
- nao usar `mainCompany.theme`
- nao usar `currentCompany.theme`
- se um token nao existir no tema oficial, registrar em `themes-new.md` ate ele existir de fato

### OBSERVACAO

- este arquivo deve ser usado somente pelo mapa de objetos
- os nomes permitidos sao apenas os que estao listados nas secoes de objetos abaixo
- nao usar `tokens base`, nomes genericos, aliases locais ou nomes inventados fora desta listagem
- no codigo, a referencia de cor deve apontar para o token canonico do objeto visual correspondente
- quando existir dúvida sobre o nome, preferir o nome que descreve o papel visual e nao o arquivo onde ele nasceu
- se o mesmo papel visual aparecer em vários modulos, o token deve continuar sendo o mesmo
- se o papel visual for diferente, parar a execução e perguntar.

### MAPA DE OBJETOS

Usar os mesmos nomes em qualquer objeto quando o papel visual for o mesmo.

### estrutura da tela

- `appBackground`
- `containerBackground`
- `containerTransparentBackground`
- `containerBorder`
- `pageBackground`
- `pageBorder`
- `panelBackground`
- `panelBorder`
- `screenBackground`
- `sectionBackground`
- `sectionBorder`
- `sheetBackground`
- `sheetBorder`
- `surface`

### barra

- `navbarBackground`
- `navbarBorder`
- `tabBarBackground`
- `tabBarBorder`
- `toolbarBackground`
- `toolbarBorder`

### badge

- `badgeBackground`
- `badgeBorder`
- `badgeDisabledBackground`
- `badgeDisabledText`
- `badgeIcon`
- `badgeSelectedBackground`
- `badgeSelectedBorder`
- `badgeSelectedText`
- `badgeShadow`
- `badgeText`

### button

- `buttonBackground`
- `buttonBackgroundSecondary`
- `buttonBorder`
- `buttonBorderSecondary`
- `buttonDisabledBackground`
- `buttonDisabledOpacity`
- `buttonDisabledText`
- `buttonFocusBorder`
- `buttonHoverBackground`
- `buttonIcon`
- `buttonIconSecondary`
- `buttonPressedBackground`
- `buttonPressedBorder`
- `buttonPressedIcon`
- `buttonShadow`
- `buttonText`
- `buttonTextSecondary`

### card

- `cardBackground`
- `cardBorder`
- `cardDisabledBackground`
- `cardDisabledText`
- `cardHeaderBackground`
- `cardHeaderText`
- `cardIcon`
- `cardIconColor`
- `cardIconBackground`
- `cardIconBorder`
- `cardSelectedBackground`
- `cardSelectedBorder`
- `cardSelectedText`
- `cardShadow`
- `cardText`

### checkbox

- `checkboxBackground`
- `checkboxBorder`
- `checkboxDisabledBackground`
- `checkboxDisabledBorder`
- `checkboxDisabledMark`
- `checkboxDisabledText`
- `checkboxSelectedBackground`
- `checkboxSelectedBorder`
- `checkboxSelectedMark`
- `checkboxText`

### chip

- `chipBackground`
- `chipBorder`
- `chipDisabledBackground`
- `chipDisabledText`
- `chipIcon`
- `chipSelectedBackground`
- `chipSelectedBorder`
- `chipSelectedText`
- `chipShadow`
- `chipText`

### divider

- `dividerBackground`
- `dividerBorder`
- `dividerText`

### footer

- `footerBackground`
- `footerBorder`
- `footerIcon`
- `footerLink`
- `footerText`

### header

- `headerBackground`
- `headerBorder`
- `headerIcon`
- `headerLink`
- `headerText`

### icon

- `iconActive`
- `iconBackground`
- `iconColor`
- `iconDanger`
- `iconDisabled`
- `iconInfo`
- `iconInverse`
- `iconMuted`
- `iconSuccess`
- `iconText`
- `iconWarning`

### input

- `inputBackground`
- `inputBorder`
- `inputFilledBorder`
- `inputDisabledBackground`
- `inputDisabledBorder`
- `inputDisabledText`
- `inputErrorBackground`
- `inputErrorBorder`
- `inputErrorText`
- `inputFocusBorder`
- `inputIcon`
- `inputPlaceholderText`
- `inputText`

### link

- `linkDisabledText`
- `linkHoverText`
- `linkText`
- `linkVisitedText`

### listItem

- `listItemActiveBackground`
- `listItemActiveBorder`
- `listItemBackground`
- `listItemBorder`
- `listItemDisabledText`
- `listItemEvenRow`
- `listItemIcon`
- `listItemOddRow`
- `listItemSelectedBackground`
- `listItemSelectedBorder`
- `listItemSubtitleText`
- `listItemText`

### loading

- `loadingBackground`
- `loadingBorder`
- `loadingDisabledBackground`
- `loadingDisabledText`
- `loadingIcon`
- `loadingOverlay`
- `loadingShadow`
- `loadingSpinner`
- `loadingText`

### menu

- `menuActiveBackground`
- `menuActiveBorder`
- `menuActiveIcon`
- `menuActiveText`
- `menuBackground`
- `menuBorder`
- `menuDisabledBackground`
- `menuDisabledBorder`
- `menuDisabledIcon`
- `menuDisabledText`
- `menuIcon`
- `menuSelectedBackground`
- `menuSelectedBorder`
- `menuSelectedText`
- `menuShadow`
- `menuText`

### modal

- `modalBackground`
- `modalBorder`
- `modalCloseIcon`
- `modalHeaderText`
- `modalOverlay`
- `modalShadow`
- `modalText`

### table

- `tableActionBackground`
- `tableActionBorder`
- `tableActionIcon`
- `tableFilterBackground`
- `tableFilterBorder`
- `tableFilterText`
- `tableFooterBackground`
- `tableFooterBorder`
- `tableFooterText`
- `tableHeaderBackground`
- `tableHeaderBorder`
- `tableHeaderIcon`
- `tableHeaderText`
- `tableRowBackground`
- `tableRowBorder`
- `tableRowEvenBackground`
- `tableRowMutedText`
- `tableRowOddBackground`
- `tableRowSelectedBackground`
- `tableRowSelectedBorder`
- `tableRowText`
- `tableToolbarBackground`
- `tableToolbarBorder`
- `tableToolbarText`

### select

- `selectBackground`
- `selectBorder`
- `selectIcon`
- `selectOptionBackground`
- `selectOptionBorder`
- `selectOptionSelectedBackground`
- `selectOptionSelectedText`
- `selectPlaceholderText`
- `selectText`

### navigation

- `navigationActiveBackground`
- `navigationActiveBorder`
- `navigationActiveIcon`
- `navigationActiveText`
- `navigationBackground`
- `navigationBorder`
- `navigationDisabledBackground`
- `navigationDisabledBorder`
- `navigationDisabledIcon`
- `navigationDisabledText`
- `navigationIcon`
- `navigationShadow`
- `navigationText`

### overlay

- `overlayBackground`
- `overlayBorder`
- `overlayShadow`

### radio

- `radioBackground`
- `radioBorder`
- `radioDisabledBackground`
- `radioDisabledBorder`
- `radioDisabledDot`
- `radioSelectedBackground`
- `radioSelectedBorder`
- `radioSelectedDot`
- `radioText`

### switch

- `switchDisabledThumb`
- `switchDisabledTrack`
- `switchOffThumb`
- `switchOffTrack`
- `switchOnThumb`
- `switchOnTrack`

### text

- `textDanger`
- `textDisabled`
- `textInverse`
- `textLink`
- `textMuted`
- `textPlaceholder`
- `textPrimary`
- `textSecondary`
- `textSuccess`
- `textWarning`

### toast

- `toastBackground`
- `toastBorder`
- `toastDangerBackground`
- `toastDangerBorder`
- `toastDangerIcon`
- `toastDangerText`
- `toastIcon`
- `toastInfoBackground`
- `toastInfoBorder`
- `toastInfoIcon`
- `toastInfoText`
- `toastShadow`
- `toastSuccessBackground`
- `toastSuccessBorder`
- `toastSuccessIcon`
- `toastSuccessText`
- `toastText`
- `toastWarningBackground`
- `toastWarningBorder`
- `toastWarningIcon`
- `toastWarningText`
