import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';

export const ORDER_TOP_BAR_ACTIONS = Object.freeze({
    PRINT: 'print',
    LOGISTICS: 'logistics',
    ATTACHMENTS: 'attachments',
    TOOLS: 'tools',
    LOGS: 'logs',
    NF: 'nf',
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
    onPressLogistics = null,
    onPressAttachments = null,
    onPressTools = null,
    onPressLogs = null,
    onPressNf = null,
    logisticsDisabled = false,
    attachmentsDisabled = false,
    toolsDisabled = false,
    logsDisabled = false,
    nfDisabled = false,
}) => {
    const visibleButtons = useMemo(
        () => new Set(Array.isArray(buttons) ? buttons : []),
        [buttons],
    );
    const shouldShowPrintAction =
        visibleButtons.has(ORDER_TOP_BAR_ACTIONS.PRINT) && !isTvDisplay && !!printJob;
    const shouldShowLogisticsAction = visibleButtons.has(ORDER_TOP_BAR_ACTIONS.LOGISTICS);
    const shouldShowAttachmentsAction = visibleButtons.has(ORDER_TOP_BAR_ACTIONS.ATTACHMENTS);
    const shouldShowToolsAction = visibleButtons.has(ORDER_TOP_BAR_ACTIONS.TOOLS);
    const shouldShowLogsAction = visibleButtons.has(ORDER_TOP_BAR_ACTIONS.LOGS);
    const shouldShowNfAction =
        visibleButtons.has(ORDER_TOP_BAR_ACTIONS.NF) && !isTvDisplay;
    const resolvedLogisticsDisabled =
        logisticsDisabled || typeof onPressLogistics !== 'function';
    const resolvedAttachmentsDisabled =
        attachmentsDisabled || typeof onPressAttachments !== 'function';
    const resolvedToolsDisabled = toolsDisabled || typeof onPressTools !== 'function';
    const resolvedLogsDisabled = logsDisabled || typeof onPressLogs !== 'function';
    const resolvedNfDisabled = nfDisabled || typeof onPressNf !== 'function';

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

            {shouldShowNfAction ? (
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={global.t?.t('orders', 'button', 'orderNf') || 'NF'}
                    onPress={onPressNf}
                    style={[
                        iconButtonStyle,
                        resolvedNfDisabled ? iconButtonDisabledStyle : null,
                    ]}
                    disabled={resolvedNfDisabled}
                >
                    <Icon name="receipt" size={20} color={iconColor} />
                </TouchableOpacity>
            ) : null}

            {shouldShowLogisticsAction ? (
                <TouchableOpacity
                    onPress={onPressLogistics}
                    style={[
                        iconButtonStyle,
                        resolvedLogisticsDisabled ? iconButtonDisabledStyle : null,
                    ]}
                    disabled={resolvedLogisticsDisabled}
                >
                    <Icon name="local-shipping" size={20} color={iconColor} />
                </TouchableOpacity>
            ) : null}

            {shouldShowAttachmentsAction ? (
                <TouchableOpacity
                    onPress={onPressAttachments}
                    style={[
                        iconButtonStyle,
                        resolvedAttachmentsDisabled ? iconButtonDisabledStyle : null,
                    ]}
                    disabled={resolvedAttachmentsDisabled}
                >
                    <Icon name="attach-file" size={20} color={iconColor} />
                </TouchableOpacity>
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
