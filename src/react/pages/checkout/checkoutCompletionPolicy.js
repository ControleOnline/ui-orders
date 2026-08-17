export const CHECKOUT_COMPLETION_DESTINATION = {
  COUNTER: 'counter',
  ORDER_DETAILS: 'order-details',
  ORDER_HISTORY: 'order-history',
  SELF_SERVICE_CATALOG: 'self-service-catalog',
};

/**
 * Keeps checkout completion independent from the screen that opened it.
 * Operational modes only select the post-payment destination; payment and
 * invoice orchestration remain shared by the canonical checkout flow.
 */
export const resolveCheckoutCompletionPolicy = ({
  isCounterMode = false,
  isSelfServiceMode = false,
  isSingleItemMode = false,
  isSimplePos = false,
  remainingAmount = 0,
} = {}) => {
  const isPaid = Number(remainingAmount) >= 0;

  if (isSingleItemMode && isPaid) {
    return {
      destination: CHECKOUT_COMPLETION_DESTINATION.ORDER_HISTORY,
      resetCompletedOrder: true,
    };
  }

  if (!isPaid) {
    return {
      destination: CHECKOUT_COMPLETION_DESTINATION.ORDER_DETAILS,
      resetCompletedOrder: false,
    };
  }

  if (isCounterMode) {
    return {
      destination: CHECKOUT_COMPLETION_DESTINATION.COUNTER,
      resetCompletedOrder: true,
    };
  }

  if (isSelfServiceMode) {
    return {
      destination: CHECKOUT_COMPLETION_DESTINATION.SELF_SERVICE_CATALOG,
      resetCompletedOrder: true,
    };
  }

  if (isSimplePos) {
    return {
      destination: CHECKOUT_COMPLETION_DESTINATION.ORDER_HISTORY,
      resetCompletedOrder: true,
    };
  }

  return {
    destination: CHECKOUT_COMPLETION_DESTINATION.ORDER_DETAILS,
    resetCompletedOrder: false,
  };
};
