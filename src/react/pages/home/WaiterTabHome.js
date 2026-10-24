import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {useStore} from '@store';
import DefaultTooltip from '@controleonline/ui-default/src/react/components/help/DefaultTooltip';
import {isPosChargeEntryEnabled} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import usePosCartSession from '../../hooks/usePosCartSession';
import {normalizeTabIdentifier, resolveWaiterTabDestination} from './waiterTabHomeActions';
import createStyles from './WaiterTabHome.styles';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace', '0', 'clear'];

export default function WaiterTabHome({navigation, operationInfo}) {
  const {currentCompany, mainCompany} = useStore('people').getters;
  const {item: deviceConfig} = useStore('device_config').getters;
  const {item: device} = useStore('device').getters;
  const {colors} = useStore('theme').getters;
  const cartActions = useStore('cart').actions;
  const {ensureActiveOrder} = usePosCartSession({
    companyId: currentCompany?.id, deviceId: device?.id,
    defaultStatusId: mainCompany?.configs?.['pos-default-status'],
    companyConfigs: currentCompany?.configs,
  });
  const [identifier, setIdentifier] = useState('');
  const [textMode, setTextMode] = useState(false);
  const inputRef = useRef(null);
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState('');
  const pendingRef = useRef(null);
  const palette = useMemo(() => resolveThemePalette({
    ...colors, ...(currentCompany?.theme?.colors || {}),
  }), [colors, currentCompany?.theme?.colors]);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const canCharge = isPosChargeEntryEnabled(deviceConfig?.configs);

  useEffect(() => {
    setIdentifier(''); setTextMode(false); setFeedback(''); setBusy('');
    return () => {pendingRef.current?.abort(); pendingRef.current = null;};
  }, [currentCompany?.id, device?.id, deviceConfig?.configs]);

  useEffect(() => {
    if (textMode) inputRef.current?.focus();
  }, [textMode]);

  function changeIdentifier(value) {
    setIdentifier(String(value ?? ''));
    setFeedback('');
  }
  function toggleInputMode() {
    inputRef.current?.blur();
    setTextMode(current => !current);
  }
  function pressKey(key) {
    if (busy) return;
    if (key === 'clear') changeIdentifier('');
    else if (key === 'backspace') changeIdentifier(identifier.slice(0, -1));
    else changeIdentifier(identifier + key);
  }
  async function open(action) {
    if (pendingRef.current || !normalizeTabIdentifier(identifier)) return;
    const controller = new AbortController();
    pendingRef.current = controller;
    setBusy(action); setFeedback('');
    try {
      const destination = await resolveWaiterTabDestination({
        action, externalCode: identifier, companyId: currentCompany?.id, deviceId: device?.id,
        configs: deviceConfig?.configs, cartActions, ensureActiveOrder, signal: controller.signal,
      });
      if (destination && !controller.signal.aborted) {
        navigation.navigate(destination.screen, destination.params);
      }
    } catch (error) {
      if (!controller.signal.aborted) setFeedback(error?.message || 'Não foi possível acessar a comanda.');
    } finally {
      if (pendingRef.current === controller) {pendingRef.current = null; setBusy('');}
    }
  }
  function actionButton(action, label, primary = false) {
    const disabled = !!busy || !normalizeTabIdentifier(identifier);
    return (
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={label}
        accessibilityState={{disabled, busy: busy === action}} disabled={disabled}
        onPress={() => open(action)} style={[styles.action, primary ? styles.primary : styles.secondary, disabled && styles.disabled]}>
        {busy === action && <ActivityIndicator size="small" color={primary ? palette.buttonText : palette.buttonTextSecondary} />}
        <Text style={primary ? styles.primaryText : styles.secondaryText}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={styles.panel}>
        <View style={styles.heading}>
          <Text style={styles.title}>Novo lançamento</Text>
          <DefaultTooltip accessibilityLabel="Ver configuração da operação" title="Configuração do PDV"
            label={<Icon name="info" size={18} color={palette.primary} />}
            rows={operationInfo} closeLabel="×" closeAccessibilityLabel="Fechar configuração do PDV"
            accentColor={palette.primary} dialogTestID="operation-info-dialog" backdropTestID="operation-info-backdrop" />
        </View>
        <View style={styles.badge}><Text style={styles.badgeText}>Comanda</Text></View>
        <Text style={styles.label}>Identificação da comanda</Text>
        <TextInput ref={inputRef} accessibilityLabel="Identificação da comanda" value={identifier}
          placeholder={textMode ? "Nome ou código" : "Número"}
          placeholderTextColor={palette.textMuted} style={styles.input} keyboardType={textMode ? "default" : "number-pad"}
          inputMode={textMode ? "text" : "numeric"} autoCorrect={false} autoCapitalize="none"
          editable={!busy} onChangeText={changeIdentifier}
          onSubmitEditing={() => open('launch')} />
        <TouchableOpacity accessibilityRole="button" disabled={!!busy} onPress={toggleInputMode}
          accessibilityLabel={textMode ? 'Usar teclado numérico' : 'Digitar nome ou código'}
          style={styles.inputModeButton}>
          <Text style={styles.inputModeText}>{textMode ? 'Usar teclado numérico' : 'Digitar nome ou código'}</Text>
        </TouchableOpacity>
        {!textMode && <View style={styles.keypad}>
          {KEYS.map(key => (
            <TouchableOpacity key={key} accessibilityRole="button" disabled={!!busy}
              accessibilityLabel={key === 'backspace' ? 'Apagar último dígito' : key === 'clear' ? 'Limpar identificação' : key}
              style={styles.key} onPress={() => pressKey(key)}>
              {key === 'backspace' ? <Icon name="delete" size={22} color={palette.buttonTextSecondary || palette.textPrimary} />
                : <Text style={key === 'clear' ? styles.clearText : styles.keyText}>{key === 'clear' ? 'Limpar' : key}</Text>}
            </TouchableOpacity>
          ))}
        </View>}
        {!!feedback && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.feedback}>{feedback}</Text>}
        {actionButton('launch', 'Lançar itens', true)}
        {actionButton('consult', 'Consultar consumo')}
        {canCharge && actionButton('charge', 'Cobrar / fechar comanda')}
      </View>
    </ScrollView>
  );
}
