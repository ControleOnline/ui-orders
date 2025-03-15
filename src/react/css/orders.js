import {StyleSheet} from 'react-native';
import globalStyles from '@controleonline/ui-shop/src/react/styles/global';
import {getStore} from '@store';
import {background} from 'native-base/lib/typescript/theme/styled-system';

const css = () => {
  const {getters} = getStore('theme');
  const {colors} = getters;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      backgroundColor: '#fff',
    },
    scrollContent: {
      paddingBottom: 70, // Espaço para o BottomToolbar
    },
    primary: {
      color: colors['primary'],
    },
    boxHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      borderTopEndRadius: 7,
      borderTopLeftRadius: 7,
      borderBottomColor: '#ccc',
      borderBottomWidth: 1,
    },
    boxContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
    },
    boxOrderText: {
      fontWeight: '700',
    },
    boxTextColor: {
      color: '#000000',
    },
    boxDateText: {
      fontSize: 13,
      fontWeight: '700',
    },
    boxPrice: {
      fontSize: 14,
      fontWeight: '700',
    },
    boxStatusText: {
      padding: 7,
      borderRadius: 20,
      fontSize: 13,
      color: '#5bbf4b',
      fontWeight: '500',
    },
    textWhite: {
      color: '#fff',
    },
    btnEdit: {
      backgroundColor: '#fff',
      flex: 1,
    },
    btnEditText: {
      color: '#000000',
      fontWeight: 'bold',
    },
    itemsSection: {
      marginTop: 20,
    },
    subHeader: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1B5587',
      marginBottom: 10,
    },
    toolbar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      height: 60,
      backgroundColor: '#f8f8f8',
      borderTopWidth: 1,
      borderTopColor: '#ddd',
      paddingHorizontal: 10,
    },
    btnPay: {
      flex: 1,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors['primary'],
    },
    boxPayment: {
      flexDirection: 'row',
      backgroundColor: '#fff',
      padding: 20,
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
      borderRadius: 7,
      elevation: 3,
    },
    selectedBoxPayment: {
      backgroundColor: '#ffffff',
    },
    paymentIcon: {
      width: 24,
      marginRight: 10,
    },
    boxInfos: {
      padding: 20,
      marginVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#ccc',
    },
    infos: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    infoText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    btnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    scrollV: {
      maxHeight: 310,
    },
    Product: {
      productsContainer: {
        flexDirection: 'column',
      },
      productItem: {
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 10,
      },
      productName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
      },
      productPrice: {
        fontSize: 16,
        color: '#007AFF',
        marginVertical: 5,
      },
      productDescription: {
        fontSize: 14,
        color: '#666',
      },
    },
    Category: {
      categoriesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        padding: 10,
      },
      categoryItem: {
        width: '48%',
        alignItems: 'center',
        marginBottom: 20,
      },
      categorySquare: {
        width: 100,
        height: 100,
        borderRadius: 10,
      },
      categoryName: {
        marginTop: 8,
        textAlign: 'center',
        fontSize: 16,
        color: colors['primary'],
      },
    },

    OrderHeader: {
      boxWrap: {
        backgroundColor: '#fff', // Fundo branco para o card
        marginHorizontal: 2, // Margem lateral para separação
        marginVertical: 8, // Margem vertical para separação
        borderRadius: 8, // Bordas arredondadas
        elevation: 4, // Sombra no Android
        shadowColor: '#000', // Sombra no iOS
        shadowOffset: {width: 0, height: 2}, // Sombra no iOS
        shadowOpacity: 0.1, // Sombra no iOS
        shadowRadius: 4, // Sombra no iOS
      },
      container: {
        padding: 10,
      },
      topInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
      },
      infoText: {
        color: '#999999',
        fontSize: 14,
      },
      customerName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#999999',
        marginVertical: 4,
      },
      statusText: {
        color: '#28a745',
      },
      tableNumber: {
        fontSize: 14,
        fontWeight: '600',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
      },
    },
  });

  return {styles, globalStyles};
};

export default css;
