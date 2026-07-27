import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import DefaultForm from '@controleonline/ui-default/src/react/components/form/DefaultForm';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import { ORDER_CANCELLATION_REASON_CONTEXT } from '@controleonline/ui-orders/src/constants/orderCancellationReasons';
import { normalizeEntityId } from '@controleonline/ui-orders/src/utils/orderState';
import { createModalStyles } from './OrderHistoryPage.styles';

const normalizeText = value => String(value || '').trim();

const parseOrderInformations = order => {
  const informations = order?.otherInformations || order?.other_informations;

  if (!informations) {
    return {};
  }

  if (typeof informations === 'string') {
    try {
      const parsed = JSON.parse(informations);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  return typeof informations === 'object' ? informations : {};
};

const getOrderCancellationPayload = order => {
  const informations = parseOrderInformations(order);
  const action = informations?.order_action || informations?.orderAction;

  return action?.payload && typeof action.payload === 'object'
    ? action.payload
    : {};
};

const getPersonLabel = person =>
  normalizeText(
    person?.alias ||
      person?.name ||
      person?.email ||
      person?.username ||
      person?.label ||
      person?.id ||
      normalizeEntityId(person),
  );

export const getCancelReasonId = reason =>
  normalizeText(
    reason?.reason_id ??
      reason?.reasonId ??
      reason?.cancelCodeId ??
      reason?.cancelCode ??
      reason?.code ??
      reason?.id ??
      reason?.value,
  );

export const getCancelReasonLabel = reason =>
  normalizeText(
    reason?.label ??
      reason?.description ??
      reason?.reason ??
      reason?.title ??
      reason?.name ??
      getCancelReasonId(reason),
  );

const getOrderDisplayId = order =>
  normalizeText(order?.displayId || order?.id || normalizeEntityId(order));

const getOrderCancellationReasonLabel = order => {
  const payload = getOrderCancellationPayload(order);

  return normalizeText(
    order?.cancellationReason?.name ||
      order?.cancellationReason?.label ||
      order?.cancellationReason?.description ||
      payload?.reason ||
      payload?.reason_id ||
      payload?.reasonId,
  );
};

const getOrderCanceledByLabel = order => {
  const payload = getOrderCancellationPayload(order);

  return normalizeText(
    getPersonLabel(order?.canceledBy) ||
      getPersonLabel(order?.cancelledBy) ||
      payload?.canceled_by ||
      payload?.canceledBy ||
      payload?.canceled_by_id ||
      payload?.canceledById,
  );
};

const ModalShell = ({ children, onClose, title, visible }) => {
  const themeStore = useStore('theme');
  const styles = useMemo(
    () => createModalStyles(themeStore?.getters?.colors || {}),
    [themeStore?.getters?.colors],
  );

  if (!visible) {
    return null;
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {title}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={global.t?.t('orders', 'button', 'close') || 'Fechar'}
                  style={styles.modalIconButton}
                  activeOpacity={0.82}
                  onPress={onClose}
                >
                  <Icon name="x" size={22} color={styles.tokens.iconWarning} />
                </TouchableOpacity>
              </View>
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export const OrderCancellationReasonsModal = ({
  accentColor,
  currentCompanyId,
  onClose,
  visible,
}) => {
  const reasonStore = useStore('order_cancellation_reasons');
  const themeStore = useStore('theme');
  const [formVisible, setFormVisible] = useState(false);
  const styles = useMemo(
    () => createModalStyles(themeStore?.getters?.colors || {}),
    [themeStore?.getters?.colors],
  );
  const requestParams = useMemo(
    () =>
      currentCompanyId
        ? {
            company: currentCompanyId,
            context: ORDER_CANCELLATION_REASON_CONTEXT,
          }
        : {},
    [currentCompanyId],
  );
  const formActions = useMemo(
    () => ({
      save: payload =>
        reasonStore.actions.save({
          ...payload,
          company: `/people/${currentCompanyId}`,
          context: ORDER_CANCELLATION_REASON_CONTEXT,
        }),
    }),
    [currentCompanyId, reasonStore.actions],
  );

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title={global.t?.t('orders', 'title', 'orderCancellationReasons') || 'Motivos de cancelamento'}
    >
      <View style={styles.reasonManagerHeader}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            global.t?.t('orders', 'button', 'addCancelReason') ||
            'Adicionar motivo'
          }
          style={[
            styles.addReasonButton,
            currentCompanyId ? null : styles.disabledButton,
          ]}
          activeOpacity={0.86}
          disabled={!currentCompanyId}
          onPress={() => setFormVisible(true)}
        >
          <Icon name="plus" size={16} color={styles.tokens.buttonIcon} />
          <Text style={styles.addReasonButtonText}>
            {global.t?.t('orders', 'button', 'addCancelReason') || 'Adicionar motivo'}
          </Text>
        </TouchableOpacity>
      </View>

      {formVisible ? (
        <View style={styles.inlineForm}>
          <DefaultForm
            actions={formActions}
            columns={reasonStore?.getters?.columns || []}
            mode="create"
            onCancel={() => setFormVisible(false)}
            onSaved={() => setFormVisible(false)}
            storeName="order_cancellation_reasons"
          />
        </View>
      ) : null}

      <View style={styles.tableArea}>
        <DefaultTable
          accentColor={accentColor}
          add={currentCompanyId ? true : false}
          onAdd={() => setFormVisible(true)}
          requestParams={requestParams}
          searchProps={{
            placeholder: global.t?.t('orders', 'placeholder', 'searchCancelReasons'),
          }}
          storeName="order_cancellation_reasons"
          summary={false}
          visibleColumnsPreferenceKey="order-cancellation-reasons"
        />
      </View>
    </ModalShell>
  );
};

const ReasonRow = ({ accentColor, reason, selected, styles, onPress }) => (
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityLabel={getCancelReasonLabel(reason)}
    style={[styles.reasonRow, selected ? { borderColor: accentColor } : null]}
    activeOpacity={0.84}
    onPress={onPress}
  >
    <Icon
      name={selected ? 'check-circle' : 'circle'}
      size={16}
      color={selected ? accentColor : styles.tokens.iconMuted}
    />
    <Text style={styles.reasonText} numberOfLines={2}>
      {getCancelReasonLabel(reason)}
    </Text>
  </TouchableOpacity>
);

export const OrderCancelModal = ({
  accentColor,
  cancelReasonText,
  cancelling,
  currentUserLabel,
  loadingReasons,
  onChangeReasonText,
  onClose,
  onConfirm,
  onManageReasons,
  onSelectReason,
  order,
  reasons,
  selectedReasonId,
  visible,
}) => {
  const themeStore = useStore('theme');
  const styles = useMemo(
    () => createModalStyles(themeStore?.getters?.colors || {}),
    [themeStore?.getters?.colors],
  );
  const selectedReason = useMemo(
    () =>
      (Array.isArray(reasons) ? reasons : []).find(
        reason => getCancelReasonId(reason) === selectedReasonId,
      ),
    [reasons, selectedReasonId],
  );
  const requiresReasonText = Boolean(selectedReason?.requires_description);
  const canConfirm =
    !cancelling &&
    !loadingReasons &&
    normalizeText(selectedReasonId) !== '' &&
    (!requiresReasonText || normalizeText(cancelReasonText) !== '');

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title={global.t?.t('orders', 'title', 'cancelOrder') || 'Cancelar pedido'}
    >
      <View style={styles.cancelBody}>
        <View style={styles.cancelInfo}>
          <Text style={styles.cancelInfoLabel}>
            {global.t?.t('orders', 'label', 'order') || 'Pedido'}
          </Text>
          <Text style={styles.cancelInfoValue}>#{getOrderDisplayId(order)}</Text>
        </View>

        <View style={styles.cancelInfo}>
          <Text style={styles.cancelInfoLabel}>
            {global.t?.t('orders', 'label', 'cancelledBy') || 'Cancelado por'}
          </Text>
          <Text style={styles.cancelInfoValue} numberOfLines={1}>
            {currentUserLabel || global.t?.t('orders', 'label', 'currentUser') || 'Usuario atual'}
          </Text>
        </View>

        <View style={styles.cancelReasonsHeader}>
          <Text style={styles.cancelSectionTitle}>
            {global.t?.t('orders', 'label', 'cancelReason') || 'Motivo'}
          </Text>
          {onManageReasons ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                global.t?.t('orders', 'button', 'manageCancelReasons') ||
                'Gerenciar motivos'
              }
              style={styles.manageReasonsButton}
              activeOpacity={0.82}
              onPress={onManageReasons}
            >
              <Icon name="tag" size={16} color={styles.tokens.buttonIcon} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView style={styles.reasonList} keyboardShouldPersistTaps="handled">
          {loadingReasons ? (
            <Text style={styles.emptyText}>
              {global.t?.t('orders', 'label', 'loading') || 'Carregando'}
            </Text>
          ) : (Array.isArray(reasons) ? reasons : []).length > 0 ? (
            reasons.map(reason => {
              const reasonId = getCancelReasonId(reason);
              return (
                <ReasonRow
                  key={reasonId || getCancelReasonLabel(reason)}
                  accentColor={accentColor}
                  reason={reason}
                  selected={reasonId === selectedReasonId}
                  styles={styles}
                  onPress={() => onSelectReason(reasonId)}
                />
              );
            })
          ) : (
            <Text style={styles.emptyText}>
              {global.t?.t('orders', 'message', 'noCancelReasonAvailable') || 'Cadastre um motivo para continuar.'}
            </Text>
          )}
        </ScrollView>

        {requiresReasonText ? (
          <TextInput
            style={styles.reasonInput}
            multiline
            value={cancelReasonText}
            placeholder={global.t?.t('orders', 'placeholder', 'cancelReasonDescription') || 'Descreva o motivo'}
            placeholderTextColor={styles.tokens.placeholder}
            onChangeText={onChangeReasonText}
          />
        ) : null}
      </View>

      <View style={styles.modalActions}>
        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.82} onPress={onClose}>
          <Text style={styles.secondaryButtonText}>
            {global.t?.t('orders', 'button', 'cancel') || 'Cancelar'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.dangerButton,
            canConfirm ? null : styles.disabledButton,
          ]}
          activeOpacity={0.86}
          disabled={!canConfirm}
          onPress={onConfirm}
        >
          <Text style={styles.dangerButtonText}>
            {cancelling
              ? global.t?.t('orders', 'label', 'saving') || 'Salvando'
              : global.t?.t('orders', 'button', 'confirmCancel') || 'Confirmar cancelamento'}
          </Text>
        </TouchableOpacity>
      </View>
    </ModalShell>
  );
};

export const OrderCancellationDetailsModal = ({
  accentColor,
  onClose,
  order,
  visible,
}) => {
  const themeStore = useStore('theme');
  const styles = useMemo(
    () => createModalStyles(themeStore?.getters?.colors || {}),
    [themeStore?.getters?.colors],
  );
  const reasonLabel =
    getOrderCancellationReasonLabel(order) ||
    global.t?.t('orders', 'label', 'notInformed') ||
    'Nao informado';
  const canceledByLabel =
    getOrderCanceledByLabel(order) ||
    global.t?.t('orders', 'label', 'notInformed') ||
    'Nao informado';

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title={global.t?.t('orders', 'title', 'cancellationDetails') || 'Cancelamento do pedido'}
    >
      <View style={styles.cancelBody}>
        <View style={styles.cancelInfo}>
          <Text style={styles.cancelInfoLabel}>
            {global.t?.t('orders', 'label', 'order') || 'Pedido'}
          </Text>
          <Text style={styles.cancelInfoValue}>#{getOrderDisplayId(order)}</Text>
        </View>

        <View style={styles.cancelInfo}>
          <Text style={styles.cancelInfoLabel}>
            {global.t?.t('orders', 'label', 'cancelledBy') || 'Cancelado por'}
          </Text>
          <Text style={styles.cancelInfoValue} numberOfLines={2}>
            {canceledByLabel}
          </Text>
        </View>

        <View style={styles.cancelInfo}>
          <Text style={styles.cancelInfoLabel}>
            {global.t?.t('orders', 'label', 'cancelReason') || 'Motivo'}
          </Text>
          <Text style={styles.cancelInfoValue} numberOfLines={3}>
            {reasonLabel}
          </Text>
        </View>
      </View>

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.secondaryButton, accentColor ? { borderColor: accentColor } : null]}
          activeOpacity={0.82}
          onPress={onClose}
        >
          <Text style={styles.secondaryButtonText}>
            {global.t?.t('orders', 'button', 'close') || 'Fechar'}
          </Text>
        </TouchableOpacity>
      </View>
    </ModalShell>
  );
};
