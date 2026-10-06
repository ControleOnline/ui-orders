import React from 'react';
import {ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View} from "react-native";
import Formatter from "@controleonline/ui-common/src/utils/formatter";

export default function OrderHistoryMarkAsPaidModalView({visible, onClose, orderLabel, step, error, danger, loading, primary, search, setSearch, filteredProducts, extractId, selectedProduct, resolveProductLabel, setSelectedProduct, resolveProductPrice, paymentOptions, selectedPayment, setSelectedPayment, displayBalance, setError, setStep, submitting, primaryText, handleConfirm}) {
  return (<Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15,23,42,0.45)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}>
        <View
          style={{
            width: '100%',
            maxWidth: 520,
            maxHeight: '90%',
            backgroundColor: '#fff',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <Text style={{fontSize: 16, fontWeight: '700', color: '#0F172A'}}>
              Marcar como pago · {orderLabel}
            </Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Fechar">
              <Text style={{fontSize: 18, color: '#64748B'}}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={{paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6}}>
            <Text style={{color: '#64748B', fontSize: 12}}>
              {step === 'product'
                ? '1/3 · Selecione um produto (item único)'
                : step === 'payment'
                  ? '2/3 · Selecione a forma de pagamento'
                  : '3/3 · Confirme a operação'}
            </Text>
          </View>

          {!!error && (
            <Text style={{color: danger, paddingHorizontal: 16, paddingBottom: 8, fontSize: 13}}>
              {error}
            </Text>
          )}

          <ScrollView style={{paddingHorizontal: 16, maxHeight: 420}}>
            {loading ? (
              <View style={{paddingVertical: 40, alignItems: 'center'}}>
                <ActivityIndicator color={primary} />
              </View>
            ) : null}

            {!loading && step === 'product' ? (
              <View>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Buscar produto"
                  placeholderTextColor="#94A3B8"
                  style={{
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    marginBottom: 10,
                    color: '#0F172A',
                  }}
                />
                {filteredProducts.length === 0 ? (
                  <Text style={{color: '#64748B', paddingVertical: 16}}>
                    Nenhum produto encontrado para a empresa.
                  </Text>
                ) : (
                  filteredProducts.map(product => {
                    const id = extractId(product);
                    const selected = String(extractId(selectedProduct)) === String(id);
                    return (
                      <TouchableOpacity
                        key={id || resolveProductLabel(product)}
                        onPress={() => setSelectedProduct(product)}
                        style={{
                          borderWidth: 1,
                          borderColor: selected ? primary : '#E2E8F0',
                          backgroundColor: selected ? '#F8FAFC' : '#fff',
                          borderRadius: 8,
                          padding: 12,
                          marginBottom: 8,
                        }}>
                        <Text style={{fontWeight: '600', color: '#0F172A'}}>
                          {resolveProductLabel(product)}
                        </Text>
                        <Text style={{color: '#64748B', marginTop: 4, fontSize: 12}}>
                          {Formatter.formatMoney?.(resolveProductPrice(product)) ||
                            resolveProductPrice(product)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            ) : null}

            {!loading && step === 'payment' ? (
              <View>
                {paymentOptions.length === 0 ? (
                  <Text style={{color: '#64748B', paddingVertical: 16}}>
                    Nenhuma forma de pagamento disponível.
                  </Text>
                ) : (
                  paymentOptions.map((option, index) => {
                    const id =
                      extractId(option) ||
                      extractId(option?.paymentType) ||
                      String(index);
                    const label =
                      option?.paymentType?.paymentType ||
                      option?.paymentType?.name ||
                      option?.name ||
                      option?.paymentType ||
                      `Pagamento ${id}`;
                    const selected =
                      String(
                        extractId(selectedPayment) ||
                          extractId(selectedPayment?.paymentType),
                      ) === String(id);
                    return (
                      <TouchableOpacity
                        key={id}
                        onPress={() => setSelectedPayment(option)}
                        style={{
                          borderWidth: 1,
                          borderColor: selected ? primary : '#E2E8F0',
                          backgroundColor: selected ? '#F8FAFC' : '#fff',
                          borderRadius: 8,
                          padding: 12,
                          marginBottom: 8,
                        }}>
                        <Text style={{fontWeight: '600', color: '#0F172A'}}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            ) : null}

            {!loading && step === 'confirm' ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 8,
                  padding: 14,
                  gap: 8,
                }}>
                <Text style={{color: '#0F172A'}}>
                  Pedido: <Text style={{fontWeight: '700'}}>{orderLabel}</Text>
                </Text>
                <Text style={{color: '#0F172A'}}>
                  Produto:{' '}
                  <Text style={{fontWeight: '700'}}>
                    {resolveProductLabel(selectedProduct)}
                  </Text>
                </Text>
                <Text style={{color: '#0F172A'}}>
                  Pagamento:{' '}
                  <Text style={{fontWeight: '700'}}>
                    {selectedPayment?.paymentType?.paymentType ||
                      selectedPayment?.paymentType?.name ||
                      selectedPayment?.name ||
                      '—'}
                  </Text>
                </Text>
                <Text style={{color: '#0F172A'}}>
                  Valor (ref.):{' '}
                  <Text style={{fontWeight: '700'}}>
                    {Formatter.formatMoney?.(displayBalance) || displayBalance}
                  </Text>
                </Text>
                <Text style={{color: '#64748B', fontSize: 12, marginTop: 4}}>
                  O valor final e o status do pedido sao definidos pelo servidor.
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: '#E2E8F0',
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 8,
            }}>
            {step !== 'product' ? (
              <TouchableOpacity
                onPress={() => {
                  setError('');
                  setStep(step === 'confirm' ? 'payment' : 'product');
                }}
                disabled={submitting}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}>
                <Text style={{color: '#0F172A', fontWeight: '600'}}>Voltar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onClose}
                disabled={submitting}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}>
                <Text style={{color: '#0F172A', fontWeight: '600'}}>Cancelar</Text>
              </TouchableOpacity>
            )}

            {step === 'product' ? (
              <TouchableOpacity
                onPress={() => {
                  if (!selectedProduct) {
                    setError('Selecione um produto.');
                    return;
                  }
                  setError('');
                  setStep('payment');
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: primary,
                }}>
                <Text style={{color: primaryText, fontWeight: '700'}}>Continuar</Text>
              </TouchableOpacity>
            ) : null}

            {step === 'payment' ? (
              <TouchableOpacity
                onPress={() => {
                  if (!selectedPayment) {
                    setError('Selecione a forma de pagamento.');
                    return;
                  }
                  setError('');
                  setStep('confirm');
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: primary,
                }}>
                <Text style={{color: primaryText, fontWeight: '700'}}>Continuar</Text>
              </TouchableOpacity>
            ) : null}

            {step === 'confirm' ? (
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={submitting}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: primary,
                  opacity: submitting ? 0.7 : 1,
                }}>
                {submitting ? (
                  <ActivityIndicator color={primaryText} />
                ) : (
                  <Text style={{color: primaryText, fontWeight: '700'}}>
                    Confirmar pagamento
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>);
}
