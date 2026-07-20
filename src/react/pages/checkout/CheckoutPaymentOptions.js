import {getPaymentOptionLabel} from '@controleonline/ui-common/src/react/utils/paymentOptions';

const resolvePaymentSelectionIdentity = payment =>
  payment?.id || payment?.['@id'] || payment?.paymentType?.id || payment?.paymentType?.['@id'] || '';

export const buildPaymentSelectionOption = ({
  channel,
  description = '',
  label = '',
  payment,
  targetDeviceId = '',
  targetDeviceLabel = '',
}) => ({
  channel,
  description,
  key: [channel, targetDeviceId, resolvePaymentSelectionIdentity(payment)]
    .filter(Boolean)
    .join(':'),
  label: String(label || getPaymentOptionLabel(payment)).trim() || 'Pagamento',
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
