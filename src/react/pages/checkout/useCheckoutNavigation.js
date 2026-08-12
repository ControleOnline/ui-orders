import {useCallback} from 'react';
import {
  buildManagerPdvRouteParams,
  buildOrderDetailsRouteParams,
} from '@controleonline/ui-orders/src/react/utils/orderRoute';

/**
 * Navigation helpers for Checkout page (resets + order details params).
 * Extracted to keep Checkout.js under the absolute 500-line limit.
 */
export default function useCheckoutNavigation({
  navigation,
  isPdvInteractionMode,
}) {
  const buildOrderDetailsNavigationParams = useCallback(
    orderItem =>
      buildOrderDetailsRouteParams(
        orderItem,
        isPdvInteractionMode
          ? buildManagerPdvRouteParams({showBottomCart: false})
          : {},
      ),
    [isPdvInteractionMode],
  );

  const resetToSelfServiceCatalog = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{name: 'AddProductScreen'}],
    });
  }, [navigation]);

  const resetToCounterDestination = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'OrderHistoryPage',
          params: {resumeCounterFlow: true},
        },
      ],
    });
  }, [navigation]);

  const resetToOrderHistory = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{name: 'OrderHistoryPage'}],
    });
  }, [navigation]);

  return {
    buildOrderDetailsNavigationParams,
    resetToSelfServiceCatalog,
    resetToCounterDestination,
    resetToOrderHistory,
  };
}
