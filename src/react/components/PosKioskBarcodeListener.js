import React, {useCallback, useEffect, useRef} from 'react';
import {Platform} from 'react-native';
import {useStore} from '@store';
import {api} from '@controleonline/ui-common/src/api';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import usePosOrderMaterialization from '@controleonline/ui-orders/src/react/hooks/usePosOrderMaterialization';

const SCAN_IDLE_TIMEOUT_MS = 90;
const SCAN_MIN_LENGTH = 4;
const SCAN_MAX_TOTAL_MS = 700;
const SCAN_MAX_AVERAGE_INTERVAL_MS = 70;

const normalizeProductId = product =>
  String(product?.id || product?.['@id'] || '')
    .replace(/\D+/g, '')
    .trim();

const buildProductNotFoundError = scannedCode => {
  const error = new Error(
    `Produto nao encontrado para o codigo ${String(scannedCode || '').trim()}.`,
  );
  error.code = 'PRODUCT_NOT_FOUND';
  return error;
};

const isProductNotFoundError = error => {
  const normalizedMessage = String(error?.message || '')
    .trim()
    .toLowerCase();

  return (
    error?.code === 'PRODUCT_NOT_FOUND' ||
    normalizedMessage.includes('nao encontrado') ||
    normalizedMessage.includes('não encontrado') ||
    normalizedMessage.includes('not found')
  );
};

const PosKioskBarcodeListener = ({
  enabled = false,
  currentRouteName = '',
  interactionParams = {},
  navigation = null,
}) => {
  const peopleStore = useStore('people');
  const {currentCompany} = peopleStore.getters;

  const {showError} = useMessage();
  const {materializeOrderWithProducts, openOrderDetails} = usePosOrderMaterialization({
    interactionParams,
    navigation,
  });

  const bufferRef = useRef('');
  const startedAtRef = useRef(0);
  const lastInputAtRef = useRef(0);
  const finalizeTimeoutRef = useRef(null);

  const clearScanBuffer = useCallback(() => {
    bufferRef.current = '';
    startedAtRef.current = 0;
    lastInputAtRef.current = 0;
    if (finalizeTimeoutRef.current) {
      clearTimeout(finalizeTimeoutRef.current);
      finalizeTimeoutRef.current = null;
    }
  }, []);

  const enqueueProductByBarcode = useCallback(
    async scannedCode => {
      if (!currentCompany?.id) {
        return;
      }

      try {
        const product = await api.post('/products/sku', {
          sku: scannedCode,
          people: currentCompany.id,
        });
        const productId = normalizeProductId(product);

        if (!productId) {
          throw buildProductNotFoundError(scannedCode);
        }

        const updatedOrder = await materializeOrderWithProducts({
          products: [{product: productId, quantity: 1}],
        });

        if (!updatedOrder) {
          throw new Error('Nao foi possivel preparar o pedido para conferencia.');
        }

        if (currentRouteName !== 'OrderDetails') {
          openOrderDetails(updatedOrder);
        }
      } catch (error) {
        if (isProductNotFoundError(error)) {
          showError(
            `Codigo ${String(scannedCode || '').trim()}: produto nao encontrado.`,
            {
              duration: 4000,
              position: 'center',
            },
          );
          return;
        }

        showError(
          error?.message || 'Nao foi possivel adicionar o produto pelo codigo de barras.',
          {position: 'center'},
        );
      }
    },
    [
      currentCompany?.id,
      currentRouteName,
      materializeOrderWithProducts,
      openOrderDetails,
      showError,
    ],
  );

  const finalizeBufferedScan = useCallback(() => {
    const scannedCode = String(bufferRef.current || '').trim();
    const startedAt = Number(startedAtRef.current || 0);
    const lastInputAt = Number(lastInputAtRef.current || 0);
    clearScanBuffer();

    if (!scannedCode || scannedCode.length < SCAN_MIN_LENGTH) {
      return;
    }

    const totalDuration = Math.max(lastInputAt - startedAt, 0);
    const averageInterval =
      scannedCode.length > 1 ? totalDuration / (scannedCode.length - 1) : totalDuration;
    const looksLikeScannerInput =
      totalDuration <= SCAN_MAX_TOTAL_MS ||
      averageInterval <= SCAN_MAX_AVERAGE_INTERVAL_MS;

    if (!looksLikeScannerInput) {
      return;
    }

    void enqueueProductByBarcode(scannedCode);
  }, [clearScanBuffer, enqueueProductByBarcode]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled || !currentCompany?.id) {
      clearScanBuffer();
      return undefined;
    }

    const scheduleFinalize = () => {
      if (finalizeTimeoutRef.current) {
        clearTimeout(finalizeTimeoutRef.current);
      }

      finalizeTimeoutRef.current = setTimeout(() => {
        finalizeBufferedScan();
      }, SCAN_IDLE_TIMEOUT_MS);
    };

    const handleKeyDown = event => {
      if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const key = String(event.key || '');
      const now = Date.now();

      if (key === 'Enter') {
        if (bufferRef.current) {
          event.preventDefault();
          finalizeBufferedScan();
        }
        return;
      }

      if (key.length !== 1) {
        return;
      }

      if (lastInputAtRef.current && now - lastInputAtRef.current > SCAN_IDLE_TIMEOUT_MS) {
        clearScanBuffer();
      }

      if (!startedAtRef.current) {
        startedAtRef.current = now;
      }

      bufferRef.current += key;
      lastInputAtRef.current = now;
      scheduleFinalize();
    };

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('keydown', handleKeyDown, true);
    }

    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('keydown', handleKeyDown, true);
      }
      clearScanBuffer();
    };
  }, [
    clearScanBuffer,
    currentCompany?.id,
    enabled,
    finalizeBufferedScan,
  ]);

  return null;
};

export default PosKioskBarcodeListener;
