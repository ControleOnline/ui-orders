import {getPaymentOptionLabel} from '@controleonline/ui-common/src/react/utils/paymentOptions';

const resolvePaymentSelectionIdentity = payment =>
  payment?.id || payment?.['@id'] || payment?.paymentType?.id || payment?.paymentType?.['@id'] || '';

export const buildPaymentSelectionOption = ({
  channel,
  payment,
  targetDeviceId = '',
  targetDeviceLabel = '',
}) => ({
  channel,
  key: [channel, targetDeviceId, resolvePaymentSelectionIdentity(payment)]
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
