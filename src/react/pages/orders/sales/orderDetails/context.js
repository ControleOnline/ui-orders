import React from 'react';

export const OrderDetailsContext = React.createContext(null);

export function useOrderDetailsContext() {
  const ctx = React.useContext(OrderDetailsContext);
  if (!ctx) {
    throw new Error('useOrderDetailsContext must be used within OrderDetails provider');
  }
  return ctx;
}
