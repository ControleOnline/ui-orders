import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import useOrderDetailsVisuals from '@controleonline/ui-orders/src/react/pages/orders/sales/useOrderDetailsVisuals';
import OrderTopBarActions from '@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderTopBarActions';

const OrderStackedTopBar = ({
    order = null,
    isKds = false,
    orderHeaderProps = {},
    onBackPress = null,
    showBackButton = true,
    backIconName = 'arrow-back',
    buttons = null,
    printJob = null,
    printDisabled = false,
    printerSelection = { enabled: true },
    isTvDisplay = false,
    onPressLogistics = null,
    onPressTools = null,
    onPressLogs = null,
    logisticsDisabled = false,
    toolsDisabled = false,
    logsDisabled = false,
    eyebrow = '',
    eyebrowTextStyle = null,
    showActions = true,
}) => {
    const { styles, ppcColors } = useOrderDetailsVisuals();

    return (
        <View style={styles.topBarInlineWrap}>
            {eyebrow ? <Text style={eyebrowTextStyle}>{eyebrow}</Text> : null}

            <View style={styles.topBarHeaderRowStacked}>
                {showBackButton ? (
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={onBackPress}
                        style={styles.topBarBackButton}
                    >
                        <Icon
                            name={backIconName}
                            size={20}
                            color={ppcColors.textPrimary || '#0F172A'}
                        />
                    </TouchableOpacity>
                ) : null}

                <View style={styles.topBarHeaderContentStacked}>
                    <View style={styles.topBarHeaderSectionStacked}>
                        <OrderHeader
                            order={order}
                            isKds={isKds}
                            {...orderHeaderProps}
                        />
                    </View>
                </View>
            </View>

            {showActions ? (
                <View style={styles.topBarActionSectionStacked}>
                    <OrderTopBarActions
                        buttons={buttons}
                        containerStyle={styles.topBarActionsStacked}
                        iconButtonStyle={styles.topBarIconButton}
                        iconButtonDisabledStyle={styles.topBarIconButtonDisabled}
                        iconColor={ppcColors.accentInfo}
                        printJob={printJob}
                        printDisabled={printDisabled}
                        printerSelection={printerSelection}
                        isTvDisplay={isTvDisplay}
                        onPressLogistics={onPressLogistics}
                        onPressTools={onPressTools}
                        onPressLogs={onPressLogs}
                        logisticsDisabled={logisticsDisabled}
                        toolsDisabled={toolsDisabled}
                        logsDisabled={logsDisabled}
                    />
                </View>
            ) : null}
        </View>
    );
};

export default OrderStackedTopBar;
