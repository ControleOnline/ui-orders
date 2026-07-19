import {StyleSheet} from 'react-native';
import globalStyles from '@controleonline/ui-layout/src/react/styles/global';
import {useStore} from '@store';

const css = () => {
  const themeStore = useStore('theme');
  const getters = themeStore.getters;
  const {colors} = getters;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 8,
      backgroundColor: colors.pageBackground,
    },
    scrollContent: {
      paddingBottom: 20,
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
      color: colors.cardText,
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
        backgroundColor: colors.cardBackground,
        borderWidth: colors.cardBorder ? 1 : 0,
        borderColor: colors.cardBorder,
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
        color: '#10b981',
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
      footerContainer: {
        backgroundColor: colors.footerBackground,
        borderTopWidth: 1,
        borderTopColor: colors.footerBorder,
        paddingHorizontal: 0,
        paddingVertical: 5,
      },
      totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginBottom: 5,
      },
      total: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.footerText,
      },
      buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 50,
        paddingHorizontal: 5,
      },
    },
    printButton: {
      compactWrap: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      compactButton: {
        justifyContent: 'center',
        alignItems: 'center',
      },
      modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      },
      modalContent: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        width: '80%',
        maxHeight: '60%',
        elevation: 4,
      },
      modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors['primary'],
        marginBottom: 16,
        textAlign: 'center',
      },
      printerItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
      },
      printerText: {
        fontSize: 16,
        color: '#333',
      },
      printButton: {
        padding: 0,
        justifyContent: 'center',
        alignItems: 'center',
      },
      selectButton: {
        marginLeft: 8,
        padding: 0,
        justifyContent: 'center',
        alignItems: 'center',
      },
      closeButton: {
        marginTop: 16,
        padding: 12,
        backgroundColor: colors['primary'],
        borderRadius: 8,
        alignItems: 'center',
      },
      closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
      },
    },
    productItem: {
      cardContainer: {
        flex: 0.5,
        margin: 6,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: colors.cardBackground,
        borderWidth: 0,
        shadowColor: colors.shadow,
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 6,
        padding: 10,
      },
      rowContainer: {
        flexDirection: 'row',
        padding: 10,
        alignItems: 'flex-start',
        marginBottom: 10,
      },
      infoContainer: {
        flex: 1,
        padding: 5,
        paddingRight: 10,
      },
      columnContainer: {
        flexDirection: 'column',
      },
      productName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 4,
      },
      productDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 2,
      },
      groupContainer: {
        marginTop: 5,
      },
      groupName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#444',
        marginBottom: 4,
      },
      componentText: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
      },
      imageContainer: {
        width: 100,
        height: 100,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: colors.imagePlaceholder,
        justifyContent: 'center',
        alignItems: 'center',
      },
      priceRow: {
        flexDirection: 'row',
        padding: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.borderColor,
      },
      priceContainer: {
        flex: 1,
        justifyContent: 'center',
        padding: 5,
        flexDirection: 'column',
        alignItems: 'flex-start',
      },
      priceText: {
        fontSize: 16,
        color: colors.textPrimary,
        fontWeight: 'bold',
      },
      totalContainer: {
        width: 100,
        justifyContent: 'center',
        alignItems: 'center',
      },
      totalText: {
        fontSize: 16,
        color: '#000',
        fontWeight: 'bold',
        textAlign: 'center',
      },
      priceTotalText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 2,
      },
      actionContainer: {
        width: 100,
        justifyContent: 'center',
        alignItems: 'center',
      },
      customizeButton: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 8,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
      },
      customizeButtonText: {
        color: colors.buttonText,
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
      },
    },
    customizeProduct: {
      Button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
      },
      ButtonText: {
        color: colors.buttonText,
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 14,
      },
    },
    productQuantity: {
      container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.quantityBackground,
        borderRadius: 25,
        paddingVertical: 4,
        paddingHorizontal: 8,
      },
      button: {
        padding: 6,
      },
      quantityText: {
        marginHorizontal: 10,
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textPrimary,
      },
      iconColor: {
        add: colors.success,
        remove: colors.warning,
        delete: colors.danger,
      },
    },
  });

  return {styles, globalStyles: globalStyles()};
};

export default css;
