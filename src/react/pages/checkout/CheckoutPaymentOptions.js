import {getPaymentOptionLabel} from '@controleonline/ui-common/src/react/utils/paymentOptions';

export const buildPaymentSelectionOption = ({
  channel,
  payment,
  targetDeviceId = '',
  targetDeviceLabel = '',
}) => ({
  channel,
  key: [channel, targetDeviceId, payment?.paymentType?.id || payment?.id]
    .filter(Boolean)
    .join(':'),
  label: getPaymentOptionLabel(payment),
  payment,
  targetDeviceId,
  targetDeviceLabel,
});

export const buildPaymentSections = ({
  canChangeRemoteDevice = false,
  localPaymentOptions = [],
  onPressRemoteAction = null,
  remotePaymentOptions = [],
  remoteSectionTitle = 'Equipamento principal',
}) => {
  const sections = [];

  if (localPaymentOptions.length > 0) {
    sections.push({
      key: 'local',
      options: localPaymentOptions,
      title: 'Neste equipamento',
    });
  }

  if (remotePaymentOptions.length > 0) {
    sections.push({
      actionLabel: canChangeRemoteDevice ? 'Trocar' : '',
      key: 'remote',
      onPressAction: canChangeRemoteDevice ? onPressRemoteAction : null,
      options: remotePaymentOptions,
      title: remoteSectionTitle,
    });
  }

  return sections;
};
