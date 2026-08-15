import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  areHistoryFiltersEqual,
  buildDefaultHistoryFilters,
  buildStatusOptions,
  buildStatusOptionsSignature,
} from './orderHistoryHelpers';

/**
 * Owns historyFilters state + store setFilters with anti-loop guards (React #185).
 */
export default function useOrderHistoryFilters({ orderActions, statusItems }) {
  const setFiltersRef = useRef(orderActions?.setFilters);
  setFiltersRef.current = orderActions?.setFilters;

  const [historyFilters, setHistoryFilters] = useState(buildDefaultHistoryFilters);
  const historyFiltersRef = useRef(historyFilters);
  historyFiltersRef.current = historyFilters;

  const applyHistoryFilters = useCallback(nextFilters => {
    const resolvedFilters =
      nextFilters && typeof nextFilters === 'object' && !Array.isArray(nextFilters)
        ? nextFilters
        : {};

    if (areHistoryFiltersEqual(historyFiltersRef.current, resolvedFilters)) {
      return;
    }

    setHistoryFilters(resolvedFilters);
    historyFiltersRef.current = resolvedFilters;

    if (typeof setFiltersRef.current === 'function') {
      setFiltersRef.current(resolvedFilters);
    }
  }, []);

  const statusOptions = useMemo(() => buildStatusOptions(statusItems), [statusItems]);
  const statusOptionsSignature = useMemo(
    () => buildStatusOptionsSignature(statusOptions),
    [statusOptions],
  );

  useEffect(() => {
    setHistoryFilters(current => {
      const next = { ...current };
      let changed = false;

      if (
        next.status &&
        !statusOptions.some(option => option.value === next.status || option.key === next.status)
      ) {
        delete next.status;
        changed = true;
      }

      if (!changed) {
        return current;
      }

      historyFiltersRef.current = next;
      if (typeof setFiltersRef.current === 'function') {
        setFiltersRef.current(next);
      }
      return next;
    });
  }, [statusOptionsSignature, statusOptions]);

  return {
    historyFilters,
    applyHistoryFilters,
    statusOptions,
  };
}
