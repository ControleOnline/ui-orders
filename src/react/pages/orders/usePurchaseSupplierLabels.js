import { useEffect, useRef, useState } from 'react';
import { getEntityId, getPeopleLabel } from './orderHistoryHelpers';

export default function usePurchaseSupplierLabels(orders, peopleActions) {
  const [purchaseSuppliersById, setPurchaseSuppliersById] = useState({});
  const loadingRef = useRef(new Set());
  useEffect(() => {
    const missing = [...new Set(
      (orders || []).filter(o => o?.orderType === 'purchase').map(o => {
        const id = getEntityId(o?.client);
        if (!id || getPeopleLabel(o?.client) || Object.prototype.hasOwnProperty.call(purchaseSuppliersById, id) || loadingRef.current.has(id)) return null;
        return id;
      }).filter(Boolean),
    )];
    if (!missing.length) return undefined;
    missing.forEach(id => loadingRef.current.add(id));
    let cancelled = false;
    (async () => {
      const resolved = await Promise.all(missing.map(async id => {
        try { return [id, getPeopleLabel(await peopleActions.get(id))]; }
        catch { return [id, '']; }
        finally { loadingRef.current.delete(id); }
      }));
      if (cancelled) return;
      setPurchaseSuppliersById(prev => {
        const next = { ...prev };
        let changed = false;
        resolved.forEach(([id, label]) => { if (next[id] !== label) { next[id] = label; changed = true; } });
        return changed ? next : prev;
      });
    })();
    return () => { cancelled = true; };
  }, [orders, peopleActions, purchaseSuppliersById]);
  return purchaseSuppliersById;
}
