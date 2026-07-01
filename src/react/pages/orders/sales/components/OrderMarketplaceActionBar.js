import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import useOrderDetailsVisuals from '../useOrderDetailsVisuals';

const resolveToneStyle = (styles, tone) => {
  if (tone === 'danger') {
    return styles.kdsActionDanger;
  }

  if (tone === 'success') {
    return styles.kdsActionSuccess;
  }

  if (tone === 'neutral') {
    return styles.kdsActionNeutral;
  }

  return styles.kdsActionPrimary;
};

const OrderMarketplaceActionBar = ({actions}) => {
  const {styles} = useOrderDetailsVisuals();

  if (!Array.isArray(actions) || !actions.length) {
    return null;
  }

  return (
    <View style={styles.kdsActionRow}>
      {actions.map(action => (
        <TouchableOpacity
          key={action.key}
          onPress={action.onPress}
          disabled={action.disabled}
          style={[
            styles.kdsActionButton,
            resolveToneStyle(styles, action.tone),
            action.disabled && styles.kdsActionButtonDisabled,
          ]}>
          {action.loading ? (
            <Text style={styles.kdsActionText}>
              {global.t?.t('orders', 'label', 'loading') || 'Carregando...'}
            </Text>
          ) : (
            <>
              {!!action.icon && (
                <Icon name={action.icon} size={16} color="#F8FAFC" />
              )}
              <Text style={styles.kdsActionText}>{action.label}</Text>
            </>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default OrderMarketplaceActionBar;
