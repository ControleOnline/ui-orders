import {StyleSheet} from 'react-native';
import {useTheme} from '@controleonline/ui-layout/src/react/components/ThemeProvider';

const css = () => {
  const {colors} = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      backgroundColor: '#fff',
    },
    scrollContent: {
      paddingBottom: 70, // Espaço para o BottomToolbar
    },
    boxWrap: {
      flex: 1,
      backgroundColor: '#fff',
      marginBottom: 15,
      borderLeftColor: colors['primary'],
      borderLeftWidth: 7,
      elevation: 3,
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
      borderTopEndRadius: 7,
      borderTopLeftRadius: 7,
    },
    boxOrderText: {
      fontWeight: '700',
    },
    boxTextColor: {
      color: '#000000',
    },
    boxDateText: {
      color: '#000000',
      fontSize: 13,
      fontWeight: '700',
    },
    boxPrice: {
      color: '#000000',
      fontSize: 14,
      fontWeight: '700',
    },
    boxStatusText: {
      padding: 7,
      borderRadius: 20,
      fontSize: 13,
      color: colors['primary'],
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
    container: {
      flex: 1,
      backgroundColor: '#fff',
    },
    scrollContent: {
      padding: 10,
      paddingBottom: 70,
    },
    orderContainer: {
      flex: 1,
    },
    header: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#1B5587',
      marginBottom: 15,
    },
    boxWrap: {
      backgroundColor: '#fff',
      marginBottom: 15,
      borderLeftColor: '#5bbf4b',
      borderLeftWidth: 7,
      elevation: 3,
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
    textWhite: {
      color: '#fff',
      fontWeight: 'bold',
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
        borderBottomColor: '#ccc'
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
    }
  });

  return styles;
};

export default css;
