import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import {useStore} from '@store';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import OrderAttachmentManager from '@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderAttachmentManager';
import {buildOrderDetailsRouteParams} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import {normalizeEntityId} from '@controleonline/ui-orders/src/utils/orderState';
import {
  buildPurchaseHistoryLoadedKey,
  buildPurchaseHistoryQuery,
  countOrderAttachments,
  normalizeCollection,
  resolveOrderAttachmentKind,
  resolveOrderAttachmentLabel,
  resolvePurchaseOrderDate,
  resolvePurchaseOrderDocument,
  resolvePurchaseOrderLabel,
  resolvePurchaseOrderLineLabel,
  resolvePurchaseOrderLineQuantity,
  resolvePurchaseOrderLineTotal,
  resolvePurchaseOrderLineUnit,
  resolvePurchaseOrderLineUnitPrice,
  resolvePurchaseSupplierLabel,
} from '@controleonline/ui-orders/src/react/utils/menuCostsPurchases';
import {MAIN_TABS} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/tabs';
import {
  resolveMenuCostsTabRoute,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/navigation';
import {resolveFileImageUrl, resolveFileDownloadUrl} from '@controleonline/ui-common/src/react/utils/fileUrl';
import {
  extractCollectionItems,
  hasHydraNext,
} from '@controleonline/ui-products/src/react/domain/menuCostsPagination';
import styles, {MENU_COLORS} from './MenuCostsPurchasesPage.styles';

const getNativeWebView = () => {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    return require('react-native-webview').WebView;
  } catch {
    return null;
  }
};

const NativeWebView = getNativeWebView();

const IconButton = ({icon, label, onPress, active, disabled = false, primary = false}) => (
  <TouchableOpacity
    style={[
      styles.iconButton,
      active && styles.iconButtonActive,
      primary && styles.toolbarButtonPrimary,
      disabled && {opacity: 0.6},
    ]}
    activeOpacity={disabled ? 1 : 0.82}
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
  >
    <Icon name={icon} size={16} color={active || primary ? MENU_COLORS.brand : MENU_COLORS.muted} />
    {label ? (
      <Text
        style={[
          styles.iconButtonText,
          active && styles.iconButtonTextActive,
          primary && styles.toolbarButtonTextPrimary,
        ]}
      >
        {label}
      </Text>
    ) : null}
  </TouchableOpacity>
);

const ToolbarButton = ({icon, label, onPress, primary = false, disabled = false}) => (
  <TouchableOpacity
    style={[
      styles.toolbarButton,
      primary && styles.toolbarButtonPrimary,
      disabled && {opacity: 0.6},
    ]}
    activeOpacity={disabled ? 1 : 0.82}
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
  >
    <Icon name={icon} size={16} color={primary ? MENU_COLORS.brand : MENU_COLORS.brandText} />
    <Text style={[styles.toolbarButtonText, primary && styles.toolbarButtonTextPrimary]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const Badge = ({label, tone = 'neutral'}) => {
  const toneStyle =
    tone === 'good'
      ? styles.toneGood
      : tone === 'warn'
        ? styles.toneWarn
        : tone === 'bad'
          ? styles.toneBad
          : styles.toneNeutral;

  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
};

const SearchBox = ({value, onChangeText, placeholder}) => (
  <View style={styles.searchBox}>
    <Icon name="search" size={16} color={MENU_COLORS.muted} />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={MENU_COLORS.muted}
      style={styles.searchInput}
    />
    {!!value && (
      <TouchableOpacity onPress={() => onChangeText('')} style={styles.searchClearButton}>
        <Icon name="x-circle" size={16} color={MENU_COLORS.muted} />
      </TouchableOpacity>
    )}
  </View>
);

const EmptyState = ({text = 'Nenhum registro encontrado.'}) => (
  <View style={styles.emptyState}>
    <Icon name="inbox" size={24} color={MENU_COLORS.muted} />
    <Text style={styles.emptyStateText}>{text}</Text>
  </View>
);

const InfoGrid = ({rows}) => (
  <View style={styles.infoGrid}>
    {rows.map(row => (
      <View key={row.label} style={styles.infoCell}>
        <Text style={styles.infoLabel}>{row.label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>
          {row.value}
        </Text>
        {row.helper ? (
          <Text style={styles.infoHelper} numberOfLines={3}>
            {row.helper}
          </Text>
        ) : null}
      </View>
    ))}
  </View>
);

const LineItemCard = ({item}) => (
  <View style={styles.lineCard}>
    <View style={styles.lineRow}>
      <Text style={styles.lineTitle} numberOfLines={2}>
        {resolvePurchaseOrderLineLabel(item)}
      </Text>
      <Text style={styles.lineValue}>
        {Formatter.formatMoney(resolvePurchaseOrderLineTotal(item))}
      </Text>
    </View>
    <Text style={styles.lineMeta} numberOfLines={2}>
      {`${resolvePurchaseOrderLineQuantity(item)} ${resolvePurchaseOrderLineUnit(item)} · unit ${Formatter.formatMoney(resolvePurchaseOrderLineUnitPrice(item))}`}
    </Text>
  </View>
);

const isImageAttachment = file => {
  const fileType = String(file?.fileType || '').trim().toLowerCase();
  const fileName = String(file?.fileName || file?.name || file?.path || '').trim().toLowerCase();
  return fileType === 'image' || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName);
};

const AttachmentCard = ({relation, onPress, company}) => {
  const file = relation?.file || relation;
  const previewUrl = resolveFileImageUrl(file, {company});

  return (
  <TouchableOpacity
    style={styles.attachmentCard}
    activeOpacity={0.82}
    onPress={onPress}
  >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 10,
          backgroundColor: '#F8FAFC',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          marginRight: 12,
        }}
      >
        {isImageAttachment(file) && previewUrl ? (
          <Image
            source={{uri: previewUrl}}
            style={{width: '100%', height: '100%'}}
            resizeMode="cover"
          />
        ) : (
          <Text style={{fontSize: 18}}>📎</Text>
        )}
      </View>
      <View style={styles.attachmentMain}>
        <Text style={styles.attachmentTitle} numberOfLines={2}>
          {resolveOrderAttachmentLabel(relation)}
        </Text>
        <Text style={styles.attachmentMeta} numberOfLines={1}>
          {resolveOrderAttachmentKind(relation)}
        </Text>
      </View>
      <Text style={styles.attachmentAction}>
        Abrir
      </Text>
    </TouchableOpacity>
  );
};

const resolveSectionTitle = () => 'Compras do ERP com evidências vinculadas';

const getOrderKey = order => normalizeEntityId(order) || String(order?.id || '');

const getOrderDateLabel = order => {
  const value = resolvePurchaseOrderDate(order);
  return value ? Formatter.formatDateYmdTodmY(value, true) : 'Sem data';
};

const getOrderTotalLabel = order =>
  Formatter.formatMoney(Number(order?.price || order?.totalAmount || 0));

export default function MenuCostsPurchasesPage({navigation}) {
  const {showError} = useMessage() || {};
  const peopleStore = useStore('people');
  const ordersStore = useStore('orders');
  const orderFileStore = useStore('order_file');
  const {currentCompany} = peopleStore.getters || {};
  const {width} = useWindowDimensions();
  const isWide = width >= 1060;

  const ordersActions = ordersStore.actions || {};
  const orderFileActions = orderFileStore.actions || {};

  const {items: storedOrders, totalItems, isLoadingList} = ordersStore.getters || {};

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderLoading, setSelectedOrderLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attachmentsVisible, setAttachmentsVisible] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsLoadingMore, setAttachmentsLoadingMore] = useState(false);
  const [attachmentsHasMore, setAttachmentsHasMore] = useState(false);

  const lastLoadedSelectedIdRef = useRef('');
  const nextPageRef = useRef(1);
  const attachmentNextPageRef = useRef(1);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const historyQuery = useMemo(
    () =>
      buildPurchaseHistoryQuery({
        companyId: currentCompany?.id,
        searchText: debouncedQuery,
        page: 1,
        orderField: 'id',
        orderDirection: 'desc',
      }),
    [currentCompany?.id, debouncedQuery],
  );

  const historyLoadedKey = useMemo(
    () =>
      buildPurchaseHistoryLoadedKey({
        companyId: currentCompany?.id,
        searchText: debouncedQuery,
        orderField: 'id',
        orderDirection: 'desc',
      }),
    [currentCompany?.id, debouncedQuery],
  );

  const storedOrderList = Array.isArray(storedOrders) ? storedOrders : [];
  const hasMore = Number(totalItems || 0) > storedOrderList.length;

  const loadOrdersPage = useCallback(
    async ({pageNumber = 1, append = false} = {}) => {
      if (!historyQuery) {
        ordersActions.setItems?.([]);
        ordersActions.setTotalItems?.(0);
        setSelectedOrderId('');
        setSelectedOrder(null);
        return;
      }

      try {
        if (append) {
          setLoadingMore(true);
        }

        await ordersActions.fetchHistoryPage({
          query: {
            ...historyQuery,
            page: pageNumber,
          },
          append,
          loadedKey: historyLoadedKey,
        });

        nextPageRef.current = pageNumber + 1;
      } catch (error) {
        showError?.(error?.message || 'Falha ao carregar as compras.');
      } finally {
        setLoadingMore(false);
      }
    },
    [historyLoadedKey, historyQuery, ordersActions, showError],
  );

  const loadAttachmentsPage = useCallback(
    async ({orderId, pageNumber = 1, append = false} = {}) => {
      if (!orderId || typeof orderFileActions.getItems !== 'function') {
        setAttachedFiles([]);
        setAttachmentsHasMore(false);
        return [];
      }

      const currentPage = Number(pageNumber || 1) > 0 ? Number(pageNumber) : 1;

      try {
        if (append) {
          setAttachmentsLoadingMore(true);
        } else {
          setAttachmentsLoading(true);
          setAttachedFiles([]);
          setAttachmentsHasMore(false);
          attachmentNextPageRef.current = 1;
        }

        const response = await orderFileActions.getItems({
          order: `/orders/${orderId}`,
          page: currentPage,
        });
        const pageItems = extractCollectionItems(response);

        setAttachedFiles(current => {
          if (!append) {
            return pageItems;
          }

          const seen = new Set();
          return [...current, ...pageItems].filter(item => {
            const key = String(item?.id || item?.['@id'] || item?.file?.id || '').trim();
            if (!key || seen.has(key)) {
              return false;
            }
            seen.add(key);
            return true;
          });
        });
        setAttachmentsHasMore(hasHydraNext(response));
        attachmentNextPageRef.current = currentPage + 1;

        return pageItems;
      } catch (error) {
        showError?.(error?.message || 'Falha ao carregar as evidências do pedido.');
        if (!append) {
          setAttachedFiles([]);
        }
        setAttachmentsHasMore(false);
        return [];
      } finally {
        setAttachmentsLoading(false);
        setAttachmentsLoadingMore(false);
      }
    },
    [orderFileActions, showError],
  );

  const refreshSelectedOrder = useCallback(
    async orderId => {
      if (!orderId || !ordersActions.get || lastLoadedSelectedIdRef.current === String(orderId)) {
        return;
      }

      lastLoadedSelectedIdRef.current = String(orderId);

      const fallbackOrder =
        storedOrderList.find(order => getOrderKey(order) === String(orderId)) || null;

      setSelectedOrderLoading(true);
      setSelectedOrder(fallbackOrder);

      try {
        const detail = await ordersActions.get(orderId);
        setSelectedOrder(detail || fallbackOrder);
        await loadAttachmentsPage({orderId, pageNumber: 1, append: false});
      } catch (error) {
        showError?.(error?.message || 'Falha ao carregar os detalhes da compra.');
      } finally {
        setSelectedOrderLoading(false);
      }
    },
    [loadAttachmentsPage, ordersActions, showError, storedOrderList],
  );

  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id) {
        ordersActions.setItems?.([]);
        ordersActions.setTotalItems?.(0);
        setSelectedOrderId('');
        setSelectedOrder(null);
        return undefined;
      }

      nextPageRef.current = 1;
      void loadOrdersPage({pageNumber: 1, append: false});
      return undefined;
    }, [currentCompany?.id, loadOrdersPage, ordersActions]),
  );

  useEffect(() => {
    if (!storedOrderList.length) {
      setSelectedOrderId('');
      setSelectedOrder(null);
      lastLoadedSelectedIdRef.current = '';
      return;
    }

    const currentSelected = selectedOrderId
      ? storedOrderList.find(order => getOrderKey(order) === String(selectedOrderId))
      : null;

    if (!currentSelected) {
      const firstOrderId = getOrderKey(storedOrderList[0]);
      if (firstOrderId && firstOrderId !== selectedOrderId) {
        setSelectedOrderId(firstOrderId);
      }
    }
  }, [selectedOrderId, storedOrderList]);

  useEffect(() => {
    if (!selectedOrderId) {
      return undefined;
    }

    void refreshSelectedOrder(selectedOrderId);
    return undefined;
  }, [refreshSelectedOrder, selectedOrderId]);

  const handleTabPress = useCallback(
    tab => {
      const {routeName, params} = resolveMenuCostsTabRoute(tab);

      if (routeName === 'MenuCostsPurchasesPage') {
        return;
      }

      navigation?.navigate?.(routeName, params || {});
    },
    [navigation],
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingList || loadingMore || !historyQuery) {
      return;
    }

    void loadOrdersPage({
      pageNumber: nextPageRef.current,
      append: true,
    });
  }, [hasMore, historyQuery, isLoadingList, loadOrdersPage, loadingMore]);

  const handleRefresh = useCallback(() => {
    void loadOrdersPage({pageNumber: 1, append: false});
    if (selectedOrderId) {
      lastLoadedSelectedIdRef.current = '';
      void refreshSelectedOrder(selectedOrderId);
    }
  }, [loadOrdersPage, refreshSelectedOrder, selectedOrderId]);

  const openOrderDetails = useCallback(() => {
    if (!selectedOrder) {
      return;
    }

    navigation?.navigate?.('OrderDetails', buildOrderDetailsRouteParams(selectedOrder));
  }, [navigation, selectedOrder]);

  const closeAttachmentPreview = useCallback(() => {
    setPreviewAttachment(null);
  }, []);

  const openAttachment = useCallback(async relation => {
    const file = relation?.file || relation;

    if (!file) {
      showError?.('Nao foi possivel abrir o arquivo.');
      return;
    }

    setPreviewAttachment(file);
  }, [showError]);

  const previewAttachmentUrl = useMemo(() => {
    if (!previewAttachment) {
      return '';
    }

    return resolveFileDownloadUrl(previewAttachment, {company: currentCompany});
  }, [currentCompany, previewAttachment]);

  const previewAttachmentTitle = useMemo(() => {
    if (!previewAttachment) {
      return '';
    }

    return resolveOrderAttachmentLabel({file: previewAttachment});
  }, [previewAttachment]);

  const previewAttachmentIsImage = useMemo(
    () => isImageAttachment(previewAttachment),
    [previewAttachment],
  );

  const handleDetailScroll = useCallback(
    event => {
      if (!selectedOrderId || attachmentsLoading || attachmentsLoadingMore || !attachmentsHasMore) {
        return;
      }

      const layoutHeight = event?.nativeEvent?.layoutMeasurement?.height || 0;
      const contentOffsetY = event?.nativeEvent?.contentOffset?.y || 0;
      const contentHeight = event?.nativeEvent?.contentSize?.height || 0;

      if (layoutHeight + contentOffsetY >= contentHeight - 240) {
        void loadAttachmentsPage({
          orderId: selectedOrderId,
          pageNumber: attachmentNextPageRef.current,
          append: true,
        });
      }
    },
    [
      attachmentNextPageRef,
      attachmentsHasMore,
      attachmentsLoading,
      attachmentsLoadingMore,
      loadAttachmentsPage,
      selectedOrderId,
    ],
  );

  const selectedOrderLines = useMemo(
    () => normalizeCollection(selectedOrder?.orderProducts),
    [selectedOrder?.orderProducts],
  );

  const selectedAttachmentCount = countOrderAttachments(attachedFiles);

  const renderOrderItem = useCallback(
    ({item}) => {
      const orderKey = getOrderKey(item);
      const isSelected = String(selectedOrderId) === String(orderKey);

      return (
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.orderCard, isSelected && styles.orderCardSelected]}
          onPress={() => setSelectedOrderId(orderKey)}
        >
          <OrderHeader order={item} isKds={false} />
          <View style={styles.orderCardMetaRow}>
            <Badge label={resolvePurchaseOrderDocument(item) || 'Sem documento'} tone="neutral" />
            <Badge label={getOrderTotalLabel(item)} tone="good" />
            <Badge label={getOrderDateLabel(item)} tone="neutral" />
          </View>
        </TouchableOpacity>
      );
    },
    [selectedOrderId],
  );

  const detailContent = selectedOrder ? (
    <ScrollView
      style={styles.detailScroll}
      contentContainerStyle={styles.detailContent}
      showsVerticalScrollIndicator={false}
      onScroll={handleDetailScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.detailHeader}>
        <OrderHeader order={selectedOrder} isKds={false} />
        <View style={styles.detailHeaderActions}>
          <ToolbarButton
            icon="external-link"
            label="Abrir pedido"
            onPress={openOrderDetails}
            primary
          />
          <ToolbarButton
            icon="paperclip"
            label={`Anexos (${selectedAttachmentCount})`}
            onPress={() => setAttachmentsVisible(true)}
          />
          <ToolbarButton
            icon="refresh-cw"
            label="Atualizar"
            onPress={handleRefresh}
          />
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionCardHeader}>
          <View>
            <Text style={styles.sectionCardTitle}>Resumo da compra</Text>
            <Text style={styles.sectionCardSubtitle}>
              Pedido real do ERP com itens, total e evidências vinculadas.
            </Text>
          </View>
          <Text style={styles.sectionCardMeta}>
            {selectedOrderLoading ? 'Carregando' : `#${getOrderKey(selectedOrder)}`}
          </Text>
        </View>

        <InfoGrid
          rows={[
            {
              label: 'Fornecedor',
              value: resolvePurchaseSupplierLabel(selectedOrder),
              helper: selectedOrder?.client?.document || selectedOrder?.client?.alias || 'Vínculo comercial',
            },
            {
              label: 'Documento',
              value: resolvePurchaseOrderDocument(selectedOrder) || 'Sem documento',
              helper: selectedOrder?.notes || selectedOrder?.evidenceSource || 'Contrato do pedido',
            },
            {
              label: 'Total',
              value: getOrderTotalLabel(selectedOrder),
              helper: `${selectedOrderLines.length} item(ns) no pedido`,
            },
            {
              label: 'Data',
              value: getOrderDateLabel(selectedOrder),
              helper: resolvePurchaseOrderLabel(selectedOrder),
            },
            {
              label: 'Evidências',
              value: String(selectedAttachmentCount),
              helper: 'Arquivos vinculados ao pedido',
            },
            {
              label: 'Status',
              value: selectedOrder?.status?.status || selectedOrder?.status?.realStatus || 'open',
              helper: selectedOrder?.status?.color || 'Status operacional',
            },
          ]}
        />
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionCardHeader}>
          <View>
            <Text style={styles.sectionCardTitle}>Itens da compra</Text>
            <Text style={styles.sectionCardSubtitle}>
              Linhas do pedido materializadas pelo ERP.
            </Text>
          </View>
          <Text style={styles.sectionCardMeta}>{selectedOrderLines.length} linha(s)</Text>
        </View>

        {selectedOrderLines.length ? (
          <View style={styles.lineList}>
            {selectedOrderLines.map((line, index) => (
              <LineItemCard
                key={getOrderKey(line) || `${selectedOrderId}-${index}`}
                item={line}
              />
            ))}
          </View>
        ) : (
          <EmptyState text="Nenhum item de compra encontrado neste pedido." />
        )}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionCardHeader}>
          <View>
            <Text style={styles.sectionCardTitle}>Evidências vinculadas</Text>
            <Text style={styles.sectionCardSubtitle}>
              A biblioteca canônica de arquivos é aberta pelo mini gerenciador.
            </Text>
          </View>
          <Text style={styles.sectionCardMeta}>{selectedAttachmentCount} arquivo(s)</Text>
        </View>

        {attachmentsLoading && attachedFiles.length === 0 ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="small" color={MENU_COLORS.brand} />
            <Text style={styles.emptyStateText}>Carregando evidências...</Text>
          </View>
        ) : attachedFiles.length ? (
          <View style={styles.attachmentList}>
            {attachedFiles.map(relation => (
              <AttachmentCard
                key={relation?.id || relation?.file?.id || resolveOrderAttachmentLabel(relation)}
                relation={relation}
                company={currentCompany}
                onPress={() => openAttachment(relation)}
              />
            ))}
            {attachmentsLoadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={MENU_COLORS.brand} />
              </View>
            ) : null}
          </View>
        ) : (
          <EmptyState text="Nenhuma evidência vinculada a esta compra." />
        )}
      </View>
    </ScrollView>
  ) : (
    <EmptyState text="Selecione uma compra para ver itens e evidências." />
  );

  const renderHeader = () => (
    <View style={styles.toolbar}>
      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>Custos do cardápio</Text>
        <Text style={styles.pageTitle}>Compras e evidências</Text>
      </View>
      <View style={styles.toolbarActions}>
        <ToolbarButton icon="refresh-cw" label="Recarregar" onPress={handleRefresh} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={styles.page}>
        {renderHeader()}

        <View style={[styles.body, !isWide && styles.bodyCompact]}>
          <View style={[styles.sidebar, !isWide && styles.sidebarCompact]}>
            <ScrollView horizontal={!isWide} showsHorizontalScrollIndicator={false}>
              <View style={[styles.menuList, !isWide && styles.menuListHorizontal]}>
                {MAIN_TABS.map(tab => (
                  <IconButton
                    key={tab.key}
                    icon={tab.icon}
                    label={tab.label}
                    active={tab.key === 'purchases'}
                    onPress={() => handleTabPress(tab.key)}
                    disabled={tab.key === 'purchases'}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.content}>
            <View style={styles.sectionTop}>
              <View>
                <Text style={styles.sectionEyebrow}>Compras</Text>
                <Text style={styles.sectionTitle}>{resolveSectionTitle()}</Text>
              </View>
              <SearchBox
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar compra, fornecedor ou documento"
              />
            </View>

            <View style={[styles.splitLayout, !isWide && styles.splitLayoutCompact]}>
              <View style={[styles.listPanel, !isWide && styles.listPanelCompact]}>
                <FlatList
                  data={storedOrderList}
                  keyExtractor={item => getOrderKey(item) || String(item?.id)}
                  contentContainerStyle={styles.listContent}
                  renderItem={renderOrderItem}
                  onEndReached={handleLoadMore}
                  onEndReachedThreshold={0.35}
                  ListEmptyComponent={
                    isLoadingList ? (
                      <View style={styles.emptyState}>
                        <ActivityIndicator size="small" color={MENU_COLORS.brand} />
                        <Text style={styles.emptyStateText}>Carregando compras do ERP...</Text>
                      </View>
                    ) : (
                      <EmptyState text="Nenhuma compra encontrada para esta empresa." />
                    )
                  }
                  ListFooterComponent={
                    loadingMore ? (
                      <View style={styles.loadingMore}>
                        <ActivityIndicator size="small" color={MENU_COLORS.brand} />
                      </View>
                    ) : null
                  }
                />
              </View>

              <View style={[styles.detailPanel, !isWide && styles.detailPanelCompact]}>
                {selectedOrderLoading && !selectedOrder ? (
                  <View style={styles.emptyState}>
                    <ActivityIndicator size="small" color={MENU_COLORS.brand} />
                    <Text style={styles.emptyStateText}>Carregando detalhes da compra...</Text>
                  </View>
                ) : (
                  detailContent
                )}
              </View>
            </View>
          </View>
        </View>
      </View>

      <OrderAttachmentManager
        visible={attachmentsVisible}
        onClose={() => setAttachmentsVisible(false)}
        order={selectedOrder}
        company={currentCompany}
        onChanged={() => {
          if (selectedOrderId) {
            void loadAttachmentsPage({orderId: selectedOrderId, pageNumber: 1, append: false});
          }
        }}
      />

      <Modal
        visible={Boolean(previewAttachment)}
        transparent
        animationType="fade"
        onRequestClose={closeAttachmentPreview}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          justifyContent: 'center',
          padding: 16,
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 18,
            overflow: 'hidden',
            maxHeight: '90%',
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
            }}>
              <View style={{flex: 1, paddingRight: 12}}>
                <Text style={{fontSize: 15, fontWeight: '800', color: '#0F172A'}} numberOfLines={1}>
                  {previewAttachmentTitle || 'Evidência'}
                </Text>
                <Text style={{fontSize: 12, color: '#64748B'}} numberOfLines={1}>
                  {resolveOrderAttachmentKind({file: previewAttachment})}
                </Text>
              </View>
              <TouchableOpacity onPress={closeAttachmentPreview} style={{padding: 8}}>
                <Icon name="x" size={18} color="#334155" />
              </TouchableOpacity>
            </View>

            <View style={{height: 520, backgroundColor: '#0F172A'}}>
              {previewAttachmentIsImage && previewAttachmentUrl ? (
                <Image
                  source={{uri: previewAttachmentUrl}}
                  style={{width: '100%', height: '100%'}}
                  resizeMode="contain"
                />
              ) : Platform.OS === 'web' ? (
                <iframe
                  title={previewAttachmentTitle || 'attachment-preview'}
                  src={previewAttachmentUrl}
                  style={{width: '100%', height: '100%', border: 0, background: '#fff'}}
                />
              ) : NativeWebView ? (
                <NativeWebView
                  source={{uri: previewAttachmentUrl}}
                  style={{flex: 1, backgroundColor: '#fff'}}
                  startInLoadingState
                />
              ) : (
                <View style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 24,
                  backgroundColor: '#fff',
                }}>
                  <Icon name="file" size={40} color="#94A3B8" />
                  <Text style={{marginTop: 12, fontSize: 14, color: '#334155', textAlign: 'center'}}>
                    Pré-visualização não suportada para este tipo de arquivo neste dispositivo.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <StateStore stores={['orders', 'order_file', 'file']} />
    </SafeAreaView>
  );
}
