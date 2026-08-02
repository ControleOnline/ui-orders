import React, {useCallback, useEffect, useMemo} from 'react';
import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useStore} from '@store';
import AnimatedModal from '@controleonline/ui-common/src/react/components/AnimatedModal';
import DefaultUpload from '@controleonline/ui-default/src/react/components/upload/DefaultUpload';
import {extractCollectionItems} from '@controleonline/ui-products/src/react/domain/menuCostsPagination';
import styles from './OrderAttachmentManager.styles';

const ORDER_ATTACHMENTS_CONTEXT = 'order-attachments';

const getEntityId = entity => {
  if (!entity) return null;

  if (typeof entity === 'number' || typeof entity === 'string') {
    const matches = String(entity).match(/\d+/g);
    return matches ? Number(matches[matches.length - 1]) : null;
  }

  if (typeof entity === 'object') {
    if (entity.id) return Number(entity.id);
    if (entity['@id']) {
      const matches = String(entity['@id']).match(/\d+/g);
      return matches ? Number(matches[matches.length - 1]) : null;
    }
  }

  return null;
};

const OrderAttachmentManager = ({
  visible = false,
  onClose = () => {},
  order = null,
  company = null,
  onChanged,
}) => {
  const peopleStore = useStore('people');
  const orderFileStore = useStore('order_file');

  const {currentCompany, defaultCompany} = peopleStore.getters || {};
  const resolvedCompany = company || currentCompany || defaultCompany || null;
  const companyId = useMemo(() => getEntityId(resolvedCompany), [resolvedCompany]);
  const orderId = useMemo(() => getEntityId(order), [order]);
  const orderIri = useMemo(() => (orderId ? `/orders/${orderId}` : null), [orderId]);

  const orderActions = orderFileStore.actions || {};
  const attachedFiles = Array.isArray(orderFileStore.getters?.items)
    ? orderFileStore.getters.items
    : [];

  const loadAttachments = useCallback(async () => {
    if (!orderIri || typeof orderActions.getItems !== 'function') {
      return [];
    }

    const response = await orderActions.getItems({
      order: orderIri,
      page: 1,
    });

    return extractCollectionItems(response);
  }, [orderActions, orderIri]);

  const handleChanged = useCallback(async () => {
    await loadAttachments();
    await onChanged?.();
  }, [loadAttachments, onChanged]);

  useEffect(() => {
    if (!visible || !orderIri) {
      return;
    }

    void loadAttachments();
  }, [loadAttachments, orderIri, visible]);

  if (!visible || !orderIri) {
    return null;
  }

  const orderLabel = `#${orderId || '--'}`;

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose} style={styles.modalAlignEnd}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>
              {global.t?.t('orders', 'title', 'attachments') || 'Anexos do pedido'} {orderLabel}
            </Text>
            <Text style={styles.subtitle}>
              {global.t?.t('orders', 'message', 'manageOrderFiles') ||
                'Use o gerenciador compartilhado para subir, anexar e remover arquivos do pedido.'}
            </Text>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <DefaultUpload
            relationStoreName="order_file"
            relationField="order"
            relationResource="orders"
            attachments={attachedFiles}
            entityId={orderId}
            companyId={companyId}
            context={ORDER_ATTACHMENTS_CONTEXT}
            libraryContexts={[ORDER_ATTACHMENTS_CONTEXT]}
            fileType=""
            acceptedTypes="*/*"
            fileTypeLabel="arquivo"
            title={global.t?.t('orders', 'title', 'currentAttachments') || 'Anexos vinculados'}
            triggerLabel={global.t?.t('orders', 'button', 'manageAttachments') || 'Gerenciar anexos'}
            managerTitle={`${global.t?.t('orders', 'title', 'attachments') || 'Anexos do pedido'} ${orderLabel}`}
            searchPlaceholder={global.t?.t('orders', 'placeholder', 'searchFiles') || 'Buscar arquivo'}
            emptyAttachmentLabel={
              global.t?.t('orders', 'message', 'noAttachmentsLinked') ||
              'Nenhum arquivo vinculado a este pedido.'
            }
            emptyLibraryLabel={
              global.t?.t('orders', 'message', 'noFilesFound') ||
              'Nenhum arquivo encontrado na biblioteca.'
            }
            saveBeforeLabel="Salve o pedido antes de anexar arquivos."
            uploadSuccessMessage="Arquivo enviado e vinculado com sucesso."
            attachSuccessMessage="Arquivo anexado ao pedido com sucesso."
            removeSuccessMessage="Arquivo removido do pedido."
            attachedLabel={global.t?.t('orders', 'label', 'attached') || 'Vinculado'}
            onBeforeOpen={loadAttachments}
            onChanged={handleChanged}
          />
        </View>
      </View>
    </AnimatedModal>
  );
};

export default OrderAttachmentManager;
