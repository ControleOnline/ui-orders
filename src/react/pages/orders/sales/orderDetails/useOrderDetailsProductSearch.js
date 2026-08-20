import { useCallback, useEffect, useMemo, useState } from 'react'

import { searchCompanyProducts } from '@controleonline/ui-common/src/react/utils/commercialDocumentOrders'

import { formatApiError, getEntityId } from './helpers'

/**
 * Product search state and add/customize handlers for OrderDetails.
 */
export default function useOrderDetailsProductSearch({
  canAddProductsToOrder,
  orderCompanyId,
  flushPendingOrderProductChanges,
  materializeOrderWithProducts,
  ordersActions,
  commitResolvedOrderProducts,
  refreshCurrentOrder,
  navigation,
  interactionMode,
  isSingleItemOperationMode,
  showError,
  showSuccess,
}) {
  const [productSearchText, setProductSearchText] = useState('')
  const [productSearchResults, setProductSearchResults] = useState([])
  const [productSearchLoading, setProductSearchLoading] = useState(false)
  const [productSearchSelectionId, setProductSearchSelectionId] = useState('')

  const normalizedProductSearch = useMemo(
    () => String(productSearchText || '').trim(),
    [productSearchText],
  )

  useEffect(() => {
    if (!canAddProductsToOrder) {
      setProductSearchText('')
      setProductSearchResults([])
      setProductSearchLoading(false)
      setProductSearchSelectionId('')
      return undefined
    }

    if (
      !normalizedProductSearch ||
      normalizedProductSearch.length < 2 ||
      !orderCompanyId
    ) {
      setProductSearchResults([])
      setProductSearchLoading(false)
      return undefined
    }

    let isMounted = true
    const timeoutId = setTimeout(async () => {
      try {
        setProductSearchLoading(true)
        const results = await searchCompanyProducts({
          companyId: orderCompanyId,
          query: normalizedProductSearch,
        })

        if (isMounted) {
          setProductSearchResults(Array.isArray(results) ? results : [])
        }
      } catch {
        if (isMounted) {
          setProductSearchResults([])
        }
      } finally {
        if (isMounted) {
          setProductSearchLoading(false)
        }
      }
    }, 180)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [canAddProductsToOrder, normalizedProductSearch, orderCompanyId])

  const handleQuickAddProductFromSearch = useCallback(
    async product => {
      if (!canAddProductsToOrder) {
        return
      }

      const nextProductId = getEntityId(product)
      if (!nextProductId) {
        showError('Não foi possível identificar o produto selecionado.')
        return
      }

      try {
        setProductSearchSelectionId(
          String(product?.id || product?.['@id'] || nextProductId),
        )
        await flushPendingOrderProductChanges()

        const updatedOrder = await materializeOrderWithProducts({
          products: [{ product: nextProductId, quantity: 1 }],
        })

        if (updatedOrder) {
          if (typeof ordersActions.syncOrder === 'function') {
            ordersActions.syncOrder(updatedOrder)
          } else {
            ordersActions.setItem(updatedOrder)
          }

          commitResolvedOrderProducts(updatedOrder)
        }

        await refreshCurrentOrder({ force: true })

        setProductSearchText('')
        setProductSearchResults([])
        showSuccess('Produto adicionado ao pedido.')
      } catch (error) {
        showError(formatApiError(error))
      } finally {
        setProductSearchSelectionId('')
      }
    },
    [
      canAddProductsToOrder,
      commitResolvedOrderProducts,
      flushPendingOrderProductChanges,
      materializeOrderWithProducts,
      ordersActions,
      refreshCurrentOrder,
      showError,
      showSuccess,
    ],
  )

  const handleCustomizeProductFromSearch = useCallback(
    product => {
      if (!canAddProductsToOrder) {
        return
      }

      const productId = getEntityId(product)
      if (!productId) {
        showError('Não foi possível identificar o produto selecionado.')
        return
      }

      setProductSearchText('')
      setProductSearchResults([])
      setProductSearchSelectionId('')

      navigation.navigate('CustomizeScreen', {
        productId,
        returnDepth: 1,
        interactionMode,
        singleItemMode: isSingleItemOperationMode,
      })
    },
    [
      canAddProductsToOrder,
      isSingleItemOperationMode,
      interactionMode,
      navigation,
      showError,
    ],
  )

  return {
    productSearchText,
    setProductSearchText,
    productSearchResults,
    productSearchLoading,
    productSearchSelectionId,
    handleQuickAddProductFromSearch,
    handleCustomizeProductFromSearch,
  }
}
