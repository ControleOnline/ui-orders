import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

import Icon from 'react-native-vector-icons/Feather';
import { useNavigationState } from '@react-navigation/native';
import { useStore } from '@store';

const ShopToolbar = ({ navigation }) => {
  const state = useNavigationState(state => state);
  const activeTab = state.routes[state.index]?.name || 'HomePage';
  const device_configStore = useStore('device_config');
  const deviceConfigGetters = device_configStore.getters;
  const { item: device } = deviceConfigGetters;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const themeStore = useStore('theme');
  const getters = themeStore.getters;
  const { colors } = getters;
  const { currentCompany } = peopleGetters;

  const isCashRegisterClosed = (() => {
    const closedId = Number(device?.configs?.['cash-wallet-closed-id']);
    return (
      !device?.configs ||
      device?.configs?.['cash-wallet-closed-id'] === undefined ||
      (Number.isFinite(closedId) && closedId > 0)
    );
  })();

  const handleOrdersPress = () => {
    if (isCashRegisterClosed) {
      navigation.navigate('CloseCashRegister');
      return;
    }

    navigation.navigate('OrderHistoryPage');
  };

  const styles = StyleSheet.create({
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      height: 60,
      backgroundColor: '#f8f8f8',
      borderTopWidth: 1,
      borderTopColor: '#ddd',
    },
    button: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 12,
      color: '#666',
      marginTop: 6,
    },
    activeText: {
      color: colors.primary,
      fontWeight: 'bold',
    },
  });

  return (
    <View style={styles.toolbar}>
      {device?.configs && Object.entries(device.configs).length > 0 && (
        <TouchableOpacity
          style={styles.button}
          disabled={
            !currentCompany || Object.entries(currentCompany).length === 0
          }
          onPress={() => {
            navigation.navigate('HomePage');
          }}>
          <Icon
            name="home"
            size={15}
            color={activeTab === 'HomePage' ? '#007AFF' : '#666'}
          />
          <Text
            style={[
              styles.buttonText,
              activeTab === 'HomePage' && styles.activeText,
            ]}>
            {global.t?.t('orders', 'label', 'home')}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={handleOrdersPress}
        disabled={
          !currentCompany || Object.entries(currentCompany).length === 0
        }>
        <Icon
          name="shopping-bag"
          size={15}
          color={activeTab === 'OrderHistoryPage' ? '#007AFF' : '#666'}
        />
        <Text
          style={[
            styles.buttonText,
            activeTab === 'OrderHistoryPage' && styles.activeText,
          ]}>
          {global.t?.t('orders', 'label', 'orders')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          navigation.navigate('ProfilePage');
        }}
        disabled={
          !currentCompany || Object.entries(currentCompany).length === 0
        }>
        <Icon
          name="user"
          size={15}
          color={activeTab === 'ProfilePage' ? '#007AFF' : '#666'}
        />
        <Text
          style={[
            styles.buttonText,
            activeTab === 'ProfilePage' && styles.activeText,
          ]}>
          {global.t?.t('orders', 'label', 'profile')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
export default ShopToolbar;
