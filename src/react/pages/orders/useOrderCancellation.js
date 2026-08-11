import { useCallback, useState } from 'react';
import { getCancelReasonLabel } from './OrderCancellationModals';
import { formatApiError, getEntityId, normalizeText } from './orderHistoryHelpers';

export default function useOrderCancellation({
  currentCompanyId, historyRequestParams, orderActions, showError, showSuccess,
}) {
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelDetailsOrder, setCancelDetailsOrder] = useState(null);
  const [cancelReasons, setCancelReasons] = useState([]);
  const [selectedCancelReasonId, setSelectedCancelReasonId] = useState('');
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [cancelReasonsLoading, setCancelReasonsLoading] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [reasonManagerVisible, setReasonManagerVisible] = useState(false);

  const loadCancelReasons = useCallback(async order => {
    const orderId = getEntityId(order);
    if (!orderId || typeof orderActions.getCancelReasons !== 'function') {
      setCancelReasons([]);
      return [];
    }
    setCancelReasonsLoading(true);
    try {
      const reasons = await orderActions.getCancelReasons({ id: orderId, companyId: currentCompanyId });
      const applicable = (Array.isArray(reasons) ? reasons : []).filter(r => r?.applicable !== false);
      setCancelReasons(applicable);
      return applicable;
    } catch (error) {
      setCancelReasons([]);
      showError?.(formatApiError(error));
      return [];
    } finally {
      setCancelReasonsLoading(false);
    }
  }, [currentCompanyId, orderActions, showError]);

  const openCancelModal = useCallback(order => {
    setCancelModalOrder(order);
    setCancelReasons([]);
    setSelectedCancelReasonId('');
    setCancelReasonText('');
    void loadCancelReasons(order);
  }, [loadCancelReasons]);

  const closeCancelModal = useCallback(() => {
    if (cancellingOrder) return;
    setCancelModalOrder(null);
    setCancelReasons([]);
    setSelectedCancelReasonId('');
    setCancelReasonText('');
  }, [cancellingOrder]);

  const closeReasonManager = useCallback(() => {
    setReasonManagerVisible(false);
    if (cancelModalOrder) void loadCancelReasons(cancelModalOrder);
  }, [cancelModalOrder, loadCancelReasons]);

  const confirmCancelOrder = useCallback(async () => {
    const orderId = getEntityId(cancelModalOrder);
    if (!orderId || typeof orderActions.cancelOrder !== 'function') return;
    const selectedReason = cancelReasons.find(r => normalizeText(
      r?.reason_id ?? r?.reasonId ?? r?.cancelCodeId ?? r?.cancelCode ?? r?.code ?? r?.id ?? r?.value,
    ) === selectedCancelReasonId);
    setCancellingOrder(true);
    try {
      await orderActions.cancelOrder({
        id: orderId,
        companyId: currentCompanyId,
        reasonId: selectedCancelReasonId,
        reason: cancelReasonText || getCancelReasonLabel(selectedReason),
        reloadParams: historyRequestParams,
      });
      showSuccess?.(global.t?.t('orders', 'message', 'orderCanceled'));
      setCancelModalOrder(null);
      setCancelReasons([]);
      setSelectedCancelReasonId('');
      setCancelReasonText('');
    } catch (error) {
      showError?.(formatApiError(error));
    } finally {
      setCancellingOrder(false);
    }
  }, [cancelModalOrder, cancelReasonText, cancelReasons, currentCompanyId, historyRequestParams, orderActions, selectedCancelReasonId, showError, showSuccess]);

  return {
    cancelModalOrder, cancelDetailsOrder, setCancelDetailsOrder, cancelReasons,
    selectedCancelReasonId, setSelectedCancelReasonId, cancelReasonText, setCancelReasonText,
    cancelReasonsLoading, cancellingOrder, reasonManagerVisible, setReasonManagerVisible,
    openCancelModal, closeCancelModal, closeReasonManager, confirmCancelOrder,
  };
}
