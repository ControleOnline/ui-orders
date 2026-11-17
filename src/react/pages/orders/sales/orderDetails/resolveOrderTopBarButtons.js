import {ORDER_TOP_BAR_ACTIONS} from '../components/OrderTopBarActions'

export const resolveOrderTopBarButtons = ({canShowDebugActions, topBarOrderId}) => {
  const buttons = [ORDER_TOP_BAR_ACTIONS.PRINT]
  if (topBarOrderId) {
    buttons.push(ORDER_TOP_BAR_ACTIONS.NF)
    buttons.push(ORDER_TOP_BAR_ACTIONS.LOGISTICS)
    buttons.push(ORDER_TOP_BAR_ACTIONS.ATTACHMENTS)
  }
  if (canShowDebugActions) {
    buttons.push(ORDER_TOP_BAR_ACTIONS.TOOLS, ORDER_TOP_BAR_ACTIONS.LOGS)
  }
  return buttons
}
