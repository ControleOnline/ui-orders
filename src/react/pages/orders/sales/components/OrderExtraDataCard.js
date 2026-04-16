import React, {useMemo} from 'react';
import {Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {formatHumanLabel} from '@controleonline/ui-common/src/react/utils/entityDisplay';
import {extractVisibleOrderExtraEntries} from '@controleonline/ui-orders/src/react/utils/orderExtraData';
import useOrderDetailsVisuals from '../useOrderDetailsVisuals';

// ExtraData fica separado para que a tela principal exiba apenas metadados do pedido.
const OrderExtraDataCard = ({order}) => {
  const {styles, ppcColors} = useOrderDetailsVisuals();

  const entries = useMemo(
    () => extractVisibleOrderExtraEntries(order),
    [order],
  );

  if (!entries.length) {
    return null;
  }

  return (
    <View style={styles.mobileInfoCard}>
      <View style={styles.mobileNoteHeader}>
        <Icon name="dataset-linked" size={14} color={ppcColors.accentInfo} />
        <Text style={styles.mobileNoteLabel}>
          {global.t?.t('orders', 'title', 'additionalInformation') ||
            'Informacoes adicionais'}
        </Text>
      </View>

      {entries.map(entry => (
        <Text key={entry.id} style={styles.mobileNoteText}>
          {formatHumanLabel(entry.label || entry.name || entry.context) || 'Campo'}: {entry.value}
        </Text>
      ))}
    </View>
  );
};

export default OrderExtraDataCard;
