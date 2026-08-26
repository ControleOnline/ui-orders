import {useCallback} from 'react'
import {Alert} from 'react-native'
import {api} from '@controleonline/ui-common/src/api'
import {
  getLinkedOrderContext,
  normalizeEntityId,
} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext'
import {
  buildCheckoutRouteParams,
  buildManagerPdvRouteParams,
  buildOrderDetailsRouteParams,
} from '@controleonline/ui-orders/src/react/utils/orderRoute'
import {
  isTerminalOrder,
  normalizeText,
} from './linkedOrderSettlementHelpers'
import {useLinkedOrderSettlementTree} from './useLinkedOrderSettlementTree'

export function useLinkedOrderSettlement({navigation, route}) {
  const tree = useLinkedOrderSettlementTree({navigation, route})
  const {
    palette,
    orderLabel,
    linkedOrderType,
    preferredInputType,
    loadingTree,
    actionLoading,
    setActionLoading,
    primaryOrder,
    settlementOrders,
    childSaleOrders,
    invoiceCards,
    invoiceSummary,
    pendingAmount,
    primaryOrderTotal,
    linkedOrderEntryState,
    resolveLinkedOrderEntry,
    handleRefresh,
    refreshSettlementTree,
    ensureSettlementOrder,
    mergeSettlementOrderIntoPrimary,
    resolveSettlementRootOrder,
    showError,
    showSuccess,
    canUseSettlementScreen,
    companyIri,
    requestLinkedOrderInput,
    currentCompany,
    treeOrders,
    selectPrimaryOrder,
    setTreeOrders,
    setTreeInvoices,
    openRootOrders,
    loadingOpenRoots,
    refreshOpenRootOrders,
    canChargeLocally,
    canManageRoots,
    pendingCartOrders,
    treeRounds,
  } = tree

  const handleIdentifyLinkedOrder = useCallback(async () => {
    if (!canUseSettlementScreen || !companyIri) {
      return
    }

    const linkedOrderInput = await requestLinkedOrderInput()
    const externalCode = normalizeText(linkedOrderInput?.externalCode)

    if (!externalCode) {
      return
    }

    setActionLoading('identify')
    try {
      const settlementOrder =
        linkedOrderInput?.settlementOrder ||
        (await ensureSettlementOrder(linkedOrderInput))
      if (!settlementOrder) {
        throw new Error(
          global.t?.t('orders', 'message', 'linkedOrderCodeRequired') ||
            `A ${orderLabel.toLowerCase()} code is required to continue.`,
        )
      }

      const candidateRootOrder = await resolveSettlementRootOrder(settlementOrder)

      if (!primaryOrder) {
        await refreshSettlementTree(candidateRootOrder)
        showSuccess?.(
          `${orderLabel} ${externalCode} ready for settlement.`,
          {position: 'center'},
        )
        return
      }

      const currentPrimaryRoot = await resolveSettlementRootOrder(primaryOrder)
      const currentPrimaryRootId = normalizeEntityId(currentPrimaryRoot)
      const candidateRootId = normalizeEntityId(candidateRootOrder)

      if (
        currentPrimaryRootId &&
        candidateRootId &&
        currentPrimaryRootId !== candidateRootId
      ) {
        await mergeSettlementOrderIntoPrimary({
          primaryRootOrder: currentPrimaryRoot,
          secondaryRootOrder: candidateRootOrder,
          linkedOrderInput,
        })
        await refreshSettlementTree(currentPrimaryRootId)
        showSuccess?.(
          `${orderLabel} ${externalCode} linked to the primary ${orderLabel.toLowerCase()}.`,
          {position: 'center'},
        )
        return
      }

      await refreshSettlementTree(currentPrimaryRootId || candidateRootId)
      showSuccess?.(
        `${orderLabel} ${externalCode} added to the current settlement.`,
        {position: 'center'},
      )
    } catch (error) {
      showError?.(
        error?.message ||
          `Unable to identify the ${orderLabel.toLowerCase()} for settlement.`,
      )
    } finally {
      setActionLoading('')
    }
  }, [
    canUseSettlementScreen,
    companyIri,
    ensureSettlementOrder,
    mergeSettlementOrderIntoPrimary,
    orderLabel,
    primaryOrder,
    refreshSettlementTree,
    requestLinkedOrderInput,
    resolveSettlementRootOrder,
    setActionLoading,
    showError,
    showSuccess,
  ])

  const handleOpenOrderDetails = useCallback(
    order => {
      navigation.navigate(
        'OrderDetails',
        buildOrderDetailsRouteParams(
          order,
          buildManagerPdvRouteParams({showBottomCart: false}),
        ),
      )
    },
    [navigation],
  )

  const handleOpenCheckout = useCallback(() => {
    if (!primaryOrder) {
      return
    }
    if (!canChargeLocally) {
      showError?.(
        global.t?.t('orders', 'message', 'localChargeDisabled') ||
          'This device is not authorized to charge. Enable local charge on the device or use an authorized cashier.',
      )
      return
    }

    navigation.navigate(
      'Checkout',
      buildCheckoutRouteParams(
        primaryOrder,
        buildManagerPdvRouteParams({showBottomCart: false}),
      ),
    )
  }, [canChargeLocally, navigation, primaryOrder, showError])

  const runCloseSettlementTree = useCallback(async () => {
    const primaryOrderId = normalizeEntityId(primaryOrder)
    if (!primaryOrderId) {
      return
    }

    if (pendingAmount > 0.009) {
      showError?.(
        `Pay the full ${orderLabel.toLowerCase()} balance before closing it.`,
      )
      return
    }

    setActionLoading('close')
    try {
      const closeQueue = [...treeOrders]
        .slice()
        .sort(
          (left, right) =>
            Number(right?.__treeDepth || 0) - Number(left?.__treeDepth || 0),
        )
        .concat(primaryOrder)
        .filter(order => !isTerminalOrder(order))

      for (const order of closeQueue) {
        const orderId = normalizeEntityId(order)
        if (!orderId) {
          continue
        }

        await api.post(`/orders/${orderId}/delivered`, {})
      }

      selectPrimaryOrder(null)
      setTreeOrders([])
      setTreeInvoices([])
      showSuccess?.(`${orderLabel} settlement closed successfully.`, {
        position: 'center',
      })
    } catch (error) {
      showError?.(
        error?.message ||
          `Unable to close the ${orderLabel.toLowerCase()} settlement.`,
      )
    } finally {
      setActionLoading('')
    }
  }, [
    orderLabel,
    pendingAmount,
    primaryOrder,
    selectPrimaryOrder,
    setActionLoading,
    setTreeInvoices,
    setTreeOrders,
    showError,
    showSuccess,
    treeOrders,
  ])

  const handleCloseSettlement = useCallback(() => {
    if (!primaryOrder) {
      return
    }

    const pendingCount = pendingCartOrders?.length || 0
    if (pendingAmount > 0.009) {
      Alert.alert(
        global.t?.t('orders', 'title', 'settlement') || `${orderLabel} settlement`,
        `This ${orderLabel.toLowerCase()} still has an open balance.`,
        [{text: global.t?.t('orders', 'button', 'ok') || 'OK'}],
      )
      return
    }

    const baseMessage =
      pendingCount > 0
        ? `There are ${pendingCount} unconfirmed cart(s). Closing will not convert or discard them silently — confirm that pending carts were handled (confirm to production, cancel, or keep). Close the ${orderLabel.toLowerCase()} and linked sales?`
        : `Close this ${orderLabel.toLowerCase()} and every linked sale order?`

    Alert.alert(
      global.t?.t('orders', 'title', 'settlement') || `${orderLabel} settlement`,
      baseMessage,
      [
        {
          text: global.t?.t('orders', 'button', 'cancel') || 'Cancel',
          style: 'cancel',
        },
        {
          text: global.t?.t('orders', 'button', 'confirm') || 'Confirm',
          onPress: () => {
            void runCloseSettlementTree()
          },
        },
      ],
    )
  }, [orderLabel, pendingAmount, pendingCartOrders, primaryOrder, runCloseSettlementTree])

  const handleSelectOpenRoot = useCallback(
    async order => {
      if (!order) {
        return
      }
      setActionLoading('select-root')
      try {
        await refreshSettlementTree(order)
      } catch (error) {
        showError?.(
          error?.message ||
            `Unable to open the selected ${orderLabel.toLowerCase()}.`,
        )
      } finally {
        setActionLoading('')
      }
    },
    [orderLabel, refreshSettlementTree, setActionLoading, showError],
  )

  const primaryContext = primaryOrder
    ? getLinkedOrderContext(primaryOrder)
    : null

  return {
    palette,
    orderLabel,
    linkedOrderType,
    preferredInputType,
    loadingTree,
    actionLoading,
    primaryOrder,
    settlementOrders,
    childSaleOrders,
    invoiceCards,
    invoiceSummary,
    pendingAmount,
    primaryOrderTotal,
    linkedOrderEntryState,
    resolveLinkedOrderEntry,
    handleIdentifyLinkedOrder,
    handleRefresh,
    handleOpenOrderDetails,
    handleOpenCheckout,
    handleCloseSettlement,
    handleSelectOpenRoot,
    primaryContext,
    canUseSettlementScreen,
    currentCompany,
    openRootOrders,
    loadingOpenRoots,
    refreshOpenRootOrders,
    canChargeLocally,
    canManageRoots,
    pendingCartOrders,
    treeRounds,
  }
}
