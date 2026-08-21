/**
 * Modal for audited post-confirmation order product quantity adjustment.
 * Flow: select item context → reason (required) → preview → commit → audit summary.
 * No direct PUT/DELETE on sale. Preview must be refreshed if quantity changes.
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  canShowOrderProductAdjustment,
  commitOrderProductAdjustment,
  createIdempotencyKey,
  previewOrderProductAdjustment,
} from '@controleonline/ui-orders/src/react/services/orderProductAdjustment';
import styles from './OrderProductAdjustmentModal.styles';

const t = (section, key, fallback) =>
  global.t?.t('orders', section, key) || fallback;

const formatQty = value => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/\.?0+$/, '');
};

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {function} props.onClose
 * @param {object} props.orderProduct - root order product to adjust
 * @param {object} [props.order]
 * @param {string|number} [props.deviceId]
 * @param {function} [props.onCommitted] - called with commit result after success
 * @param {string} [props.appType]
 * @param {boolean} [props.isClientContext]
 */
export default function OrderProductAdjustmentModal({
  visible,
  onClose,
  orderProduct,
  order,
  deviceId,
  onCommitted,
  appType,
  isClientContext = false,
}) {
  const allowed = canShowOrderProductAdjustment({order, appType, isClientContext});

  const orderProductId = orderProduct?.id ?? orderProduct?.['@id'];
  const quantityBefore = Number(
    orderProduct?.quantity ?? orderProduct?.rootQuantity ?? orderProduct?.root_quantity ?? 0,
  );
  const productLabel =
    orderProduct?.product?.product ||
    orderProduct?.product?.name ||
    orderProduct?.productName ||
    orderProduct?.description ||
    `#${orderProductId || '—'}`;

  const [quantityAfter, setQuantityAfter] = useState(String(quantityBefore));
  const [reason, setReason] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => createIdempotencyKey());
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [commitResult, setCommitResult] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setQuantityAfter(String(quantityBefore));
    setReason('');
    setIdempotencyKey(createIdempotencyKey());
    setPreview(null);
    setError(null);
    setCommitResult(null);
    setBusy(false);
  }, [visible, orderProductId, quantityBefore]);

  // Changing quantity or reason invalidates preview (must request new preview).
  useEffect(() => {
    if (!visible) return;
    setPreview(null);
    setCommitResult(null);
  }, [quantityAfter, reason, visible]);

  const qtyNumber = useMemo(() => {
    const n = Number(String(quantityAfter).replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }, [quantityAfter]);

  const canPreview =
    allowed &&
    Boolean(orderProductId) &&
    Number.isFinite(qtyNumber) &&
    qtyNumber >= 0 &&
    String(reason || '').trim().length > 0 &&
    !busy;

  const handlePreview = useCallback(async () => {
    if (!canPreview) return;
    setBusy(true);
    setError(null);
    setCommitResult(null);
    const result = await previewOrderProductAdjustment({
      orderProductId,
      quantityAfter: qtyNumber,
      reason: String(reason).trim(),
      idempotencyKey,
      deviceId,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.errmsg || t('message', 'adjustmentPreviewFailed', 'Falha no preview do ajuste.'));
      setPreview(null);
      return;
    }
    setPreview(result.preview);
  }, [canPreview, orderProductId, qtyNumber, reason, idempotencyKey, deviceId]);

  const handleCommit = useCallback(async () => {
    if (!preview || !allowed || busy) return;
    setBusy(true);
    setError(null);
    const result = await commitOrderProductAdjustment({
      orderProductId,
      quantityAfter: qtyNumber,
      reason: String(reason).trim(),
      idempotencyKey,
      deviceId,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.errmsg || t('message', 'adjustmentCommitFailed', 'Falha ao confirmar o ajuste.'));
      // Stale preview → force new preview
      if (result.errno === 20010) {
        setPreview(null);
      }
      return;
    }
    setCommitResult(result);
    setPreview(result.preview || preview);
    if (typeof onCommitted === 'function') {
      try {
        onCommitted(result);
      } catch (_) {
        /* ignore consumer errors */
      }
    }
  }, [
    preview,
    allowed,
    busy,
    orderProductId,
    qtyNumber,
    reason,
    idempotencyKey,
    deviceId,
    onCommitted,
  ]);

  const handleClose = useCallback(() => {
    if (busy) return;
    onClose?.();
  }, [busy, onClose]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {t('title', 'productAdjustment', 'Ajuste de item (auditado)')}
            </Text>
            <Pressable onPress={handleClose} disabled={busy} accessibilityRole="button">
              <Text style={styles.closeLabel}>{t('action', 'close', 'Fechar')}</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {!allowed ? (
              <Text style={styles.errorText}>
                {t(
                  'message',
                  'adjustmentNotAllowed',
                  'Ajuste não permitido neste contexto (cliente/loja/totem).',
                )}
              </Text>
            ) : (
              <>
                <Text style={styles.label}>{t('label', 'product', 'Produto')}</Text>
                <Text style={styles.value}>{productLabel}</Text>

                <Text style={styles.label}>{t('label', 'quantityBefore', 'Qtd. atual')}</Text>
                <Text style={styles.value}>{formatQty(quantityBefore)}</Text>

                <Text style={styles.label}>{t('label', 'quantityAfter', 'Nova quantidade')}</Text>
                <TextInput
                  style={styles.input}
                  value={String(quantityAfter)}
                  onChangeText={setQuantityAfter}
                  keyboardType="decimal-pad"
                  editable={!busy && !commitResult}
                  accessibilityLabel={t('label', 'quantityAfter', 'Nova quantidade')}
                />

                <Text style={styles.label}>
                  {t('label', 'adjustmentReason', 'Motivo (obrigatório)')}
                </Text>
                <TextInput
                  style={[styles.input, styles.reasonInput]}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  editable={!busy && !commitResult}
                  placeholder={t(
                    'placeholder',
                    'adjustmentReason',
                    'Descreva o motivo do ajuste',
                  )}
                  accessibilityLabel={t('label', 'adjustmentReason', 'Motivo')}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {preview ? (
                  <View style={styles.previewBox}>
                    <Text style={styles.previewTitle}>
                      {t('title', 'adjustmentPreview', 'Pré-visualização')}
                    </Text>
                    <Text style={styles.previewLine}>
                      Δ {formatQty(preview.delta)} ·{' '}
                      {t('label', 'fulfilled', 'Cumprido')}: {formatQty(preview.fulfilled)} ·{' '}
                      {t('label', 'remainingAfter', 'Restante')}:{' '}
                      {formatQty(preview.remainingAfter)}
                    </Text>
                    {preview.hasProductionQueue ? (
                      <Text style={styles.previewWarn}>
                        {t(
                          'message',
                          'hasProductionQueue',
                          'Item possui fila de produção — impacto será registrado.',
                        )}
                      </Text>
                    ) : null}
                    {preview.reason ? (
                      <Text style={styles.previewLine}>
                        {t('label', 'reason', 'Motivo')}: {preview.reason}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {commitResult?.entry ? (
                  <View style={styles.auditBox}>
                    <Text style={styles.previewTitle}>
                      {t('title', 'adjustmentAudit', 'Auditoria')}
                    </Text>
                    <Text style={styles.previewLine}>
                      ID: {commitResult.entry.id ?? '—'}
                      {commitResult.replayed
                        ? ` (${t('label', 'replayed', 'reprocessado')})`
                        : ''}
                    </Text>
                    <Text style={styles.previewLine}>
                      {t('label', 'quantityBefore', 'Antes')}:{' '}
                      {formatQty(commitResult.entry.quantityBefore ?? preview?.quantityBefore)}{' '}
                      → {t('label', 'quantityAfter', 'Depois')}:{' '}
                      {formatQty(commitResult.entry.quantityAfter ?? preview?.quantityAfter)}
                    </Text>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {busy ? <ActivityIndicator style={styles.spinner} /> : null}
            {!commitResult && allowed ? (
              <>
                <Pressable
                  style={[styles.button, styles.secondaryButton, !canPreview && styles.buttonDisabled]}
                  onPress={handlePreview}
                  disabled={!canPreview}
                  accessibilityRole="button">
                  <Text style={styles.secondaryButtonText}>
                    {t('action', 'previewAdjustment', 'Pré-visualizar')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.button,
                    styles.primaryButton,
                    (!preview || busy) && styles.buttonDisabled,
                  ]}
                  onPress={handleCommit}
                  disabled={!preview || busy}
                  accessibilityRole="button">
                  <Text style={styles.primaryButtonText}>
                    {t('action', 'confirmAdjustment', 'Confirmar ajuste')}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={[styles.button, styles.primaryButton]}
                onPress={handleClose}
                accessibilityRole="button">
                <Text style={styles.primaryButtonText}>{t('action', 'close', 'Fechar')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
