import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';

export const ORDER_TOP_BAR_ACTIONS = Object.freeze({
    PRINT: 'print',
    TOOLS: 'tools',
    LOGS: 'logs',
});

const OrderTopBarActions = ({
    buttons = [ORDER_TOP_BAR_ACTIONS.PRINT],
    containerStyle = null,
    iconButtonStyle = null,
    iconButtonDisabledStyle = null,
    iconColor = '#fff',
    printJob = null,
    printStore = 'orders',
    printDisabled = false,
    printerSelection = { enabled: true },
    isTvDisplay = false,
    onPressTools = null,
    onPressLogs = null,
    toolsDisabled = false,
    logsDisabled = false,
}) => {
    const visibleButtons = useMemo(
        () => new Set(Array.isArray(buttons) ? buttons : []),
        [buttons],
    );
    const shouldShowPrintAction =
        visibleButtons.has(ORDER_TOP_BAR_ACTIONS.PRINT) && !isTvDisplay && !!printJob;
    const shouldShowToolsAction = visibleButtons.has(ORDER_TOP_BAR_ACTIONS.TOOLS);
    const shouldShowLogsAction = visibleButtons.has(ORDER_TOP_BAR_ACTIONS.LOGS);
    const resolvedToolsDisabled = toolsDisabled || typeof onPressTools !== 'function';
    const resolvedLogsDisabled = logsDisabled || typeof onPressLogs !== 'function';

    return (
        <View style={containerStyle}>
            {shouldShowPrintAction ? (
                <PrintButton
                    job={printJob}
                    store={printStore}
                    compact
                    layout={{ variant: 'icon' }}
                    iconColor={iconColor}
                    compactButtonStyle={iconButtonStyle}
                    compactSelectStyle={iconButtonStyle}
                    printerSelection={printerSelection}
                    disabled={printDisabled}
                />
            ) : null}

            {shouldShowToolsAction ? (
                <TouchableOpacity
                    onPress={onPressTools}
                    style={[
                        iconButtonStyle,
                        resolvedToolsDisabled ? iconButtonDisabledStyle : null,
                    ]}
                    disabled={resolvedToolsDisabled}
                >
                    <Icon name="view-list" size={20} color={iconColor} />
                </TouchableOpacity>
            ) : null}

            {shouldShowLogsAction ? (
                <TouchableOpacity
                    onPress={onPressLogs}
                    style={[
                        iconButtonStyle,
                        resolvedLogsDisabled ? iconButtonDisabledStyle : null,
                    ]}
                    disabled={resolvedLogsDisabled}
                >
                    <Icon name="history" size={20} color={iconColor} />
                </TouchableOpacity>
            ) : null}
        </View>
    );
};

export default OrderTopBarActions;
