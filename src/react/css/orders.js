import { StyleSheet } from 'react-native';
import globalStyles from '@controleonline/ui-shop/src/react/styles/global';
import { getStore } from '@store';

const css = () => {
  const { getters } = getStore('theme');
  const { colors } = getters;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      backgroundColor: '#fff',
    },
    scrollContent: {
      paddingBottom: 100,
    },
    primary: {
      color: colors['primary'],
    },
    boxHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    boxContent: {
      flexDirection: 'column',
      paddingHorizontal: 10,
      paddingVertical: 5,
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
      fontSize: 16,
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
    CashRegister: {
      mainContainer: {
        padding: 10,
      },
      header: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
      },
      groupContainer: {
        marginBottom: 20,
      },
      groupTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
      },
      walletContainer: {
        borderRadius: 5,
        marginBottom: 10,
        backgroundColor: '#fff',
        elevation: 2,
      },
      walletTitle: {
        fontSize: 18,
        fontWeight: 'bold',
      },
      paymentText: {
        fontSize: 16,
        lineHeight: 22,
      },
      walletTotal: {
        fontSize: 16,
        fontWeight: 'bold',
      },
      groupTotal: {
        fontSize: 18,
        fontWeight: 'bold',
      },
      grandTotal: {
        fontSize: 20,
        fontWeight: 'bold',
      },
    },
    Settings: {
      container: {
        flex: 1,
        backgroundColor: '#fff',
      },
      scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
      },
      mainContainer: {
        flex: 1,
      },
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
        paddingVertical: 5,
      },
      label: {
        flex: 0.5,
        fontSize: 14,
        color: '#333',
      },
      value: {
        flex: 0.5,
        fontSize: 14,
        color: '#000',
      },
      walletRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
        paddingVertical: 5,
      },
      walletValueContainer: {
        flex: 0.5,
        flexDirection: 'row',
        alignItems: 'center',
      },
      walletValue: {
        fontSize: 14,
        color: '#000',
        marginRight: 5,
      },
      picker: {
        height: 50,
        fontSize: 14,
        color: '#000',
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
        marginTop: 5,
      },
    },
    payable: {
      toolbar: {
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: 60,
        backgroundColor: '#f8f8f8',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        padding: 10,
        height: 50,
      },
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
        backgroundColor: '#fff',
        color: colors['primary'],
        fontSize: 18,
        marginHorizontal: 2,
        marginVertical: 8,
        borderRadius: 8,
        elevation: 4,
      },
      container: {
        padding: 10,
      },
      price: {
        color: colors['primary'],
        fontSize: 14,
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
    CloseCashRegister: {
      buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 50,
        paddingHorizontal: 0,
      },
      button: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 5,
      },
      buttonText: {
        color: '#fff',
        marginLeft: 8,
      },
    },
  });

  return { styles, globalStyles: globalStyles() };
};

export default css;