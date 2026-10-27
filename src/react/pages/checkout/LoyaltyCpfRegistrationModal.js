import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import styles from './Checkout.styles';

const EMPTY_FORM = {email: '', firstName: '', lastName: '', phone: ''};

export default function LoyaltyCpfRegistrationModal({
  cpf,
  error,
  errors = {},
  onCancel,
  onSubmit,
  saving,
  visible,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (visible) setForm(EMPTY_FORM);
  }, [visible, cpf]);

  const setField = field => value => setForm(current => ({...current, [field]: value}));
  const renderField = (field, label, props = {}) => (
    <View style={{marginTop: 10}}>
      <Text style={styles.loyaltyHint}>{label}</Text>
      <TextInput
        editable={!saving}
        onChangeText={setField(field)}
        style={styles.loyaltyInput}
        value={form[field]}
        {...props}
      />
      {errors[field] ? <Text style={styles.loyaltyHint}>{errors[field]}</Text> : null}
    </View>
  );

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={Boolean(visible)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: 20,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
        }}>
        <View style={[styles.loyaltyCard, {maxHeight: '90%'}]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.loyaltyTitle}>Cadastrar cliente</Text>
            <Text style={styles.loyaltySubtitle}>
              CPF {Formatter.maskCPF(cpf || '')} nao encontrado. Informe os dados
              para cadastrar.
            </Text>
            {renderField('firstName', 'Nome *', {autoCapitalize: 'words'})}
            {renderField('lastName', 'Sobrenome *', {autoCapitalize: 'words'})}
            {renderField('phone', 'Telefone (opcional)', {
              keyboardType: 'phone-pad',
              maxLength: 16,
            })}
            {renderField('email', 'E-mail (opcional)', {
              autoCapitalize: 'none',
              autoCorrect: false,
              keyboardType: 'email-address',
            })}
            {error ? (
              <Text style={[styles.loyaltyHint, {marginTop: 10}]}>{error}</Text>
            ) : null}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={saving}
              onPress={() => onSubmit(form)}
              style={[styles.loyaltySecondaryAction, {marginTop: 16}]}>
              {saving ? (
                <ActivityIndicator size="small" color="#1B5587" />
              ) : (
                <Text style={styles.loyaltySecondaryActionText}>Cadastrar e continuar</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={saving}
              onPress={onCancel}
              style={[styles.loyaltySecondaryAction, {marginTop: 8}]}>
              <Text style={styles.loyaltySecondaryActionText}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
