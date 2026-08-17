import {
  CHECKOUT_COMPLETION_DESTINATION,
  resolveCheckoutCompletionPolicy,
} from './checkoutCompletionPolicy';

describe('resolveCheckoutCompletionPolicy', () => {
  test.each([
    ['single item', {isSingleItemMode: true}, CHECKOUT_COMPLETION_DESTINATION.ORDER_HISTORY, true],
    ['counter', {isCounterMode: true}, CHECKOUT_COMPLETION_DESTINATION.COUNTER, true],
    ['totem/self service', {isSelfServiceMode: true}, CHECKOUT_COMPLETION_DESTINATION.SELF_SERVICE_CATALOG, true],
    ['simple cashier', {isSimplePos: true}, CHECKOUT_COMPLETION_DESTINATION.ORDER_HISTORY, true],
    ['full cashier', {}, CHECKOUT_COMPLETION_DESTINATION.ORDER_DETAILS, false],
    ['waiter/table', {}, CHECKOUT_COMPLETION_DESTINATION.ORDER_DETAILS, false],
  ])('%s uses the canonical completion policy', (_name, mode, destination, resetCompletedOrder) => {
    expect(resolveCheckoutCompletionPolicy({...mode, remainingAmount: 0})).toEqual({
      destination,
      resetCompletedOrder,
    });
  });

  test.each([
    ['counter', {isCounterMode: true}],
    ['totem/self service', {isSelfServiceMode: true}],
    ['simple cashier', {isSimplePos: true}],
    ['full cashier', {}],
    ['waiter/table', {}],
  ])('%s keeps a partially paid order in details', (_name, mode) => {
    expect(resolveCheckoutCompletionPolicy({...mode, remainingAmount: -10})).toEqual({
      destination: CHECKOUT_COMPLETION_DESTINATION.ORDER_DETAILS,
      resetCompletedOrder: false,
    });
  });
});
