import React, {useCallback, useEffect, useMemo, useState} from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {useStore} from '@store';
import {api} from '@controleonline/ui-common/src/api';
import css from '@controleonline/ui-orders/src/react/css/orders';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';
import localStyles from './index.styles';

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

  const handleManualPrintSuccess = useCallback(completedRequest => {
    if (completedRequest?.ackPending) {
      Alert.alert(
        'Impressao concluida',
        'A Cielo imprimiu corretamente, mas a fila ainda nao foi confirmada no servidor. O app vai tentar finalizar essa spool automaticamente.',
      );
      return;
    }

    const spoolId = resolveSpoolId(completedRequest?.spoolId);
    if (spoolId) {
      setSpools(previous =>
        previous.filter(item => resolveSpoolId(item) !== spoolId),
      );
    }

    Alert.alert(
      'Impressao concluida',
      'A impressao foi enviada para a Cielo e removida da fila.',
    );
  }, []);

  const handleManualPrintError = useCallback(completedRequest => {
    Alert.alert(
      'Falha no processamento',
      formatApiError(completedRequest?.error),
    );
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
          <PrintButton
            job={{type: 'spool', spoolId}}
            label="Imprimir"
            iconColor="#fff"
            style={[globalStyles.button, localStyles.primaryAction]}
            onSuccess={handleManualPrintSuccess}
            onError={handleManualPrintError}
          />
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

export default PrintQueuePage;
