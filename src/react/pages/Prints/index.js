import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {useStore} from '@store';
import {api} from '@controleonline/ui-common/src/api';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {CieloPrint} from '@controleonline/ui-orders/src/react/services/Cielo/Print';

const formatApiError = error => {
  if (!error) return 'Nao foi possivel completar a operacao.';
  if (typeof error === 'string') return error;
  if (Array.isArray(error?.message)) {
    return error.message
      .map(item => item?.message || item?.title || String(item))
      .filter(Boolean)
      .join('\n');
  }

  return (
    error?.message ||
    error?.description ||
    error?.errmsg ||
    'Nao foi possivel completar a operacao.'
  );
};

const resolveSpoolId = value => {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numericValue = value.replace(/\D/g, '');
    return numericValue ? Number(numericValue) : null;
  }

  return (
    resolveSpoolId(value?.id) ||
    resolveSpoolId(value?.spoolId) ||
    resolveSpoolId(value?.spool) ||
    resolveSpoolId(value?.['@id'])
  );
};

const formatRegisterDate = value => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toLocaleString('pt-BR');
};

const decodePrintPayload = content => {
  if (content === null || content === undefined) return '';
  if (typeof content !== 'string') return JSON.stringify(content);

  if (typeof atob === 'function') {
    try {
      return atob(content);
    } catch (error) {
      return content;
    }
  }

  return content;
};

const sortSpools = items =>
  [...items].sort((left, right) => {
    const leftDate = new Date(left?.registerDate || 0).getTime() || 0;
    const rightDate = new Date(right?.registerDate || 0).getTime() || 0;
    return rightDate - leftDate;
  });

const getFileLabel = spool => {
  const fileName = String(spool?.file?.fileName || 'print').trim();
  const extension = String(spool?.file?.extension || '').trim();

  if (!extension || fileName.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) {
    return fileName;
  }

  return `${fileName}.${extension}`;
};

const getStatusLabel = spool =>
  String(spool?.status?.status || spool?.status?.realStatus || 'pendente');

const getStatusColor = (spool, fallbackColor) =>
  String(spool?.status?.color || '').trim() || fallbackColor;

const t = (section, group, key, fallback) =>
  global.t?.t(section, group, key) || fallback;

const PrintQueuePage = ({navigation}) => {
  const {styles, globalStyles} = css();
  const themeStore = useStore('theme');
  const deviceStore = useStore('device');

  const {colors = {}} = themeStore.getters;
  const {item: storagedDevice} = deviceStore.getters;

  const [spools, setSpools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [screenError, setScreenError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const deviceEntityIri =
    storagedDevice?.entityIri ||
    (storagedDevice?.entityId ? `/devices/${storagedDevice.entityId}` : null);

  const loadSpools = useCallback(
    async ({refresh = false} = {}) => {
      if (!deviceEntityIri) {
        setSpools([]);
        setScreenError('Device atual ainda nao foi sincronizado com o backend.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (refresh) setRefreshing(true);
      else setLoading(true);

      setScreenError('');

      try {
        const response = await api.fetch('/spools', {
          params: {
            device: deviceEntityIri,
            itemsPerPage: 200,
          },
        });

        const items = Array.isArray(response?.member) ? response.member : [];
        setSpools(sortSpools(items));
      } catch (error) {
        setScreenError(formatApiError(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [deviceEntityIri],
  );

  useEffect(() => {
    navigation.setOptions({
      title: 'Impressões',
      headerShown: true,
      headerBackVisible: true,
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadSpools();
    }, [loadSpools]),
  );

  const handleRefresh = useCallback(() => {
    loadSpools({refresh: true});
  }, [loadSpools]);

  const handlePrint = useCallback(async spool => {
    const spoolId = resolveSpoolId(spool);
    if (!spoolId) {
      Alert.alert('Falha ao imprimir', 'Nao foi possivel identificar o item.');
      return;
    }

    setProcessingId(spoolId);

    try {
      const spoolItem = await api.fetch(`/spools/${spoolId}`);
      if (!spoolItem?.file?.content) {
        throw new Error('Conteudo da impressao indisponivel para este item.');
      }

      const payload = decodePrintPayload(spoolItem.file.content);
      const cielo = new CieloPrint();
      const response = await cielo.print(payload);

      if (response?.success === false) {
        throw new Error(
          response?.result ||
            t('orders', 'message', 'printProcessingError', 'Falha ao imprimir.'),
        );
      }

      await api.fetch(`/print/${spoolId}/done`, {
        method: 'PUT',
      });

      setSpools(previous =>
        previous.filter(item => resolveSpoolId(item) !== spoolId),
      );

      Alert.alert(
        'Impressao concluida',
        'A impressao foi enviada para a Cielo e removida da fila.',
      );
    } catch (error) {
      Alert.alert(
        'Falha no processamento',
        formatApiError(error),
      );
    } finally {
      setProcessingId(null);
    }
  }, []);

  const renderEmptyState = useMemo(
    () => (
      <View style={localStyles.emptyState}>
        <Icon
          name="print-disabled"
          size={40}
          color={colors?.primary || '#1B5587'}
        />
        <Text style={localStyles.emptyTitle}>Nenhuma impressão pendente</Text>
        <Text style={localStyles.emptyCopy}>
          A fila manual fica vazia quando o auto-print conclui sem falhas.
        </Text>
      </View>
    ),
    [colors?.primary],
  );

  const renderItem = ({item}) => {
    const spoolId = resolveSpoolId(item);
    const isProcessing = processingId === spoolId;
    const statusColor = getStatusColor(item, colors?.primary || '#1B5587');

    return (
      <View style={localStyles.card}>
        <View style={localStyles.cardHeader}>
          <View style={localStyles.cardHeaderCopy}>
            <Text style={localStyles.cardTitle}>
              #{spoolId || '--'} • {getFileLabel(item)}
            </Text>
            <Text style={localStyles.cardSubtitle}>
              Registrado em {formatRegisterDate(item?.registerDate)}
            </Text>
          </View>
          <View
            style={[
              localStyles.statusBadge,
              {borderColor: statusColor, backgroundColor: `${statusColor}22`},
            ]}>
            <Text style={[localStyles.statusText, {color: statusColor}]}>
              {getStatusLabel(item)}
            </Text>
          </View>
        </View>

        <View style={localStyles.metaBlock}>
          <Text style={localStyles.metaLine}>
            Device: {item?.device?.alias || item?.device?.device || storagedDevice?.id || '--'}
          </Text>
          <Text style={localStyles.metaLine}>
            Contexto: {item?.file?.context || 'print'}
          </Text>
          <Text style={localStyles.metaLine}>
            Usuario: {item?.user?.username || item?.user?.email || '--'}
          </Text>
        </View>

        <View style={localStyles.actionsRow}>
          <TouchableOpacity
            style={[
              globalStyles.button,
              localStyles.primaryAction,
              isProcessing && localStyles.buttonDisabled,
            ]}
            onPress={() => handlePrint(item)}
            disabled={isProcessing}>
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="print" size={18} color="#fff" />
            )}
            <Text style={localStyles.buttonText}>
              {isProcessing ? 'Processando...' : 'Imprimir'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={localStyles.centerState}>
          <ActivityIndicator
            size="large"
            color={colors?.primary || '#1B5587'}
          />
          <Text style={localStyles.centerStateText}>
            {t('orders', 'message', 'loading', 'Carregando impressões...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={localStyles.infoBox}>
        <Icon
          name="info-outline"
          size={20}
          color={colors?.primary || '#1B5587'}
          style={localStyles.infoIcon}
        />
        <Text style={localStyles.infoText}>
          Use esta tela quando o auto-print falhar. O botão imprime localmente
          na Cielo e, se der certo, remove o registro da spool e o arquivo
          associado no backend na mesma ação.
        </Text>
      </View>

      {screenError ? (
        <View style={localStyles.errorBox}>
          <Text style={localStyles.errorText}>{screenError}</Text>
          <TouchableOpacity
            style={[globalStyles.button, localStyles.retryButton]}
            onPress={handleRefresh}>
            <Icon name="refresh" size={18} color="#fff" />
            <Text style={localStyles.buttonText}>Atualizar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={spools}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          String(
            resolveSpoolId(item) ||
              `${item?.file?.fileName || 'spool'}-${item?.registerDate || index}`,
          )
        }
        contentContainerStyle={localStyles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors?.primary || '#1B5587'}
          />
        }
      />
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  listContent: {
    paddingBottom: 24,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
  },
  errorBox: {
    backgroundColor: '#fff1f2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  retryButton: {
    alignSelf: 'flex-start',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderCopy: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#475569',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaBlock: {
    marginTop: 14,
  },
  metaLine: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 6,
  },
  actionsRow: {
    marginTop: 16,
  },
  primaryAction: {
    backgroundColor: '#1d4ed8',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '700',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerStateText: {
    marginTop: 12,
    fontSize: 14,
    color: '#475569',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyCopy: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: '#475569',
  },
});

export default PrintQueuePage;
