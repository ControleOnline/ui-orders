/**
 * Unit tests for order product adjustment service (client-side gates + payload).
 */
import {
  canShowOrderProductAdjustment,
  createIdempotencyKey,
} from '../../../react/services/orderProductAdjustment';

describe('orderProductAdjustment service', () => {
  describe('canShowOrderProductAdjustment', () => {
    it('hides for client context', () => {
      expect(
        canShowOrderProductAdjustment({
          order: {orderType: 'sale'},
          isClientContext: true,
        }),
      ).toBe(false);
    });

    it('hides for SHOP / TOTEM app types', () => {
      expect(
        canShowOrderProductAdjustment({
          order: {orderType: 'sale'},
          appType: 'SHOP',
        }),
      ).toBe(false);
      expect(
        canShowOrderProductAdjustment({
          order: {orderType: 'sale'},
          appType: 'TOTEM',
        }),
      ).toBe(false);
    });

    it('hides for non-sale order types', () => {
      expect(
        canShowOrderProductAdjustment({
          order: {orderType: 'purchase'},
          appType: 'POS',
        }),
      ).toBe(false);
      expect(
        canShowOrderProductAdjustment({
          order: {orderType: 'cart'},
          appType: 'MANAGER',
        }),
      ).toBe(false);
    });

    it('respects explicit capability false', () => {
      expect(
        canShowOrderProductAdjustment({
          order: {orderType: 'sale', canAdjustOrderProduct: false},
          appType: 'POS',
        }),
      ).toBe(false);
      expect(
        canShowOrderProductAdjustment({
          order: {orderType: 'sale', capabilities: {adjustOrderProduct: false}},
          appType: 'MANAGER',
        }),
      ).toBe(false);
    });

    it('allows human POS/MANAGER on sale by default', () => {
      expect(
        canShowOrderProductAdjustment({
          order: {orderType: 'sale'},
          appType: 'POS',
        }),
      ).toBe(true);
      expect(
        canShowOrderProductAdjustment({
          order: {orderType: 'sale'},
          appType: 'MANAGER',
        }),
      ).toBe(true);
    });
  });

  describe('createIdempotencyKey', () => {
    it('returns unique non-empty keys', () => {
      const a = createIdempotencyKey();
      const b = createIdempotencyKey('opa');
      expect(a).toBeTruthy();
      expect(b).toBeTruthy();
      expect(a).not.toEqual(b);
      expect(b.startsWith('opa-')).toBe(true);
    });
  });
});
