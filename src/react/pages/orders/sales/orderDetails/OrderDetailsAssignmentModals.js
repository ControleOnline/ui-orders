import React from 'react';
import {
  Modal,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AddCompanyModal from '@controleonline/ui-people/src/react/components/AddCompanyModal';
import DefaultAddress from '@controleonline/ui-default/src/react/components/address/DefaultAddress';
import { InlineLoadingText } from './InlineLoadingText';

/**
 * Customer + address assignment modals for OrderDetails.
 */
export default function OrderDetailsAssignmentModals(props) {
  const {
    customerModalVisible,
    closeCustomerModal,
    customerLinkingId,
    orderCustomerName,
    localStyles,
    ppcColors,
    modalBottomInset,
    customerSearch,
    setCustomerSearch,
    customerSearchLoading,
    customerSearchResults,
    handleSelectCustomer,
    openCustomerCreateModal,
    customerCreateModalVisible,
    setCustomerCreateModalVisible,
    handleCustomerCreated,
    addressModalVisible,
    closeAddressModal,
    addressModalMode,
    setAddressModalMode,
    addressOptions,
    addressOptionsLoading,
    addressSelectingId,
    handleSelectAddress,
    addressForm,
    handleAddressFormFieldChange,
    handleCreateAddress,
    addressSaveLoading,
    peopleStore,
  } = props;

  return (
    <>
          <Modal
            transparent
            animationType="slide"
            visible={customerModalVisible}
            onRequestClose={closeCustomerModal}
            statusBarTranslucent
            presentationStyle="overFullScreen"
          >
            <View style={localStyles.modalSheetRoot}>
              <TouchableOpacity
                activeOpacity={1}
                style={localStyles.modalSheetBackdrop}
                onPress={closeCustomerModal}
              />
              <View style={localStyles.modalSheetWrap}>
                <View
                  style={[
                    localStyles.deliveryCodeModal,
                    { paddingBottom: 14 + modalBottomInset },
                  ]}
                >
                  <View style={localStyles.deliveryCodeHeader}>
                    <Text style={localStyles.deliveryCodeStepBadge}>
                      Clientes
                    </Text>
                    <TouchableOpacity
                      onPress={closeCustomerModal}
                      disabled={!!customerLinkingId}
                      style={localStyles.deliveryCodeCloseButton}
                    >
                      <Icon name="close" size={22} color={ppcColors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={localStyles.deliveryCodeModalTitle}>
                    {orderCustomerName ? 'Trocar cliente do pedido' : 'Vincular cliente ao pedido'}
                  </Text>

                  <ScrollView
                    style={localStyles.deliveryCodeScroll}
                    contentContainerStyle={localStyles.deliveryCodeScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={localStyles.deliveryCodeDescription}>
                      Pesquise por nome, email, telefone, documento ou endereco. Se nao encontrar, use o cadastro rapido abaixo sem sair deste modal.
                    </Text>

                    <View style={localStyles.assignmentSearchBox}>
                      <Icon name="search" size={18} color={ppcColors.textSecondary} />
                      <TextInput
                        value={customerSearch}
                        onChangeText={setCustomerSearch}
                        editable={!customerLinkingId}
                        placeholder="Buscar cliente"
                        placeholderTextColor={ppcColors.textSecondary}
                        autoCapitalize="none"
                        style={localStyles.assignmentSearchInput}
                      />
                      {customerSearchLoading && (
                        <InlineLoadingText color={ppcColors.primary}>...</InlineLoadingText>
                      )}
                    </View>

                    {customerSearch.trim().length === 0 ? (
                      <View style={localStyles.assignmentEmptyState}>
                        <Text style={localStyles.assignmentEmptyStateTitle}>
                          Digite para buscar
                        </Text>
                        <Text style={localStyles.assignmentEmptyStateText}>
                          A busca considera nome, email, telefone, documento e enderecos do cliente.
                        </Text>
                      </View>
                    ) : customerSearchLoading ? (
                      <View style={localStyles.assignmentEmptyState}>
                        <InlineLoadingText color={ppcColors.primary}>Buscando clientes...</InlineLoadingText>
                      </View>
                    ) : customerSearchResults.length > 0 ? (
                      customerSearchResults.map(customer => {
                        const customerId = String(getEntityId(customer) || '')
                        const customerIri = toEntityIri(customer, 'people')
                        const customerMeta = buildCustomerSearchMeta(customer)
                        const customerTitle = resolvePreferredText(
                          customer?.alias,
                          customer?.name,
                        ) || `Cliente #${customerId || '--'}`
                        const isCurrent = customerIri === selectedOrderClientIri
                        const isSaving = customerLinkingId === customerId

                        return (
                          <TouchableOpacity
                            key={customerIri || customerId || customerTitle}
                            onPress={() => handleSelectCustomer(customer)}
                            disabled={!!customerLinkingId}
                            style={[
                              localStyles.assignmentOptionCard,
                              isCurrent && localStyles.assignmentOptionCardSelected,
                            ]}
                          >
                            <View style={localStyles.assignmentOptionTextWrap}>
                              <Text style={localStyles.assignmentOptionTitle}>
                                {customerTitle}
                              </Text>
                              {!!customerMeta && (
                                <Text style={localStyles.assignmentOptionMeta}>
                                  {customerMeta}
                                </Text>
                              )}
                            </View>

                            {isSaving ? (
                              <InlineLoadingText color={ppcColors.primary}>...</InlineLoadingText>
                            ) : isCurrent ? (
                              <Text style={localStyles.assignmentOptionBadge}>Atual</Text>
                            ) : (
                              <Icon name="chevron-right" size={20} color={ppcColors.textSecondary} />
                            )}
                          </TouchableOpacity>
                        )
                      })
                    ) : (
                      <View style={localStyles.assignmentEmptyState}>
                        <Text style={localStyles.assignmentEmptyStateTitle}>
                          Nenhum cliente encontrado
                        </Text>
                        <Text style={localStyles.assignmentEmptyStateText}>
                          Use o cadastro rapido para criar e vincular um novo cliente.
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={openCustomerCreateModal}
                      disabled={!!customerLinkingId}
                      style={localStyles.assignmentQuickActionCard}
                    >
                      <View style={localStyles.assignmentQuickActionHeader}>
                        <Icon name="person-add" size={18} color={ppcColors.accentInfo} />
                        <Text style={localStyles.assignmentQuickActionTitle}>
                          Cadastro rapido de cliente
                        </Text>
                      </View>
                      <Text style={localStyles.assignmentQuickActionText}>
                        Abre o cadastro compartilhado de clientes do CRM e vincula o resultado neste pedido.
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>

                  <View style={localStyles.deliveryCodeActions}>
                    <TouchableOpacity
                      onPress={closeCustomerModal}
                      disabled={!!customerLinkingId}
                      style={[
                        localStyles.deliveryCodeButton,
                        localStyles.deliveryCodeButtonSecondary,
                      ]}
                    >
                      <Text style={localStyles.deliveryCodeButtonSecondaryText}>
                        {global.t?.t('orders', 'button', 'close') || 'Fechar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </Modal>
          <AddCompanyModal
            visible={customerCreateModalVisible}
            onClose={() => setCustomerCreateModalVisible(false)}
            context={{ context: 'client' }}
            onSuccess={savedCustomer => {
              void handleCustomerCreated(savedCustomer)
            }}
          />
          <Modal
            transparent
            animationType="slide"
            visible={addressModalVisible}
            onRequestClose={closeAddressModal}
            statusBarTranslucent
            presentationStyle="overFullScreen"
          >
        <View style={localStyles.modalSheetRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={localStyles.modalSheetBackdrop}
            onPress={closeAddressModal}
          />
          <View style={localStyles.modalSheetWrap}>
            <View
              style={[
                localStyles.deliveryCodeModal,
                { paddingBottom: 14 + modalBottomInset },
              ]}
            >
              <View style={localStyles.deliveryCodeHeader}>
                <Text style={localStyles.deliveryCodeStepBadge}>
                  Entrega
                </Text>
                <TouchableOpacity
                  onPress={closeAddressModal}
                  disabled={addressSaveLoading || !!addressSelectingId}
                  style={localStyles.deliveryCodeCloseButton}
                >
                  <Icon name="close" size={22} color={ppcColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={localStyles.deliveryCodeModalTitle}>
                Selecionar endereco de entrega
              </Text>

              <ScrollView
                style={localStyles.deliveryCodeScroll}
                contentContainerStyle={localStyles.deliveryCodeScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={localStyles.deliveryCodeDescription}>
                  {selectedOrderClientIri
                    ? 'Escolha um endereço já cadastrado para este cliente ou use o cadastro rápido abaixo sem sair deste modal.'
                    : 'Sem cliente vinculado, use o cadastro rápido abaixo para definir o endereço deste pedido.'}
                </Text>

                {!!orderCustomerName && !!selectedOrderClientIri && (
                  <View style={localStyles.assignmentContextCard}>
                    <Icon name="person" size={16} color={ppcColors.accentInfo} />
                    <Text style={localStyles.assignmentContextText}>
                      Cliente selecionado: {orderCustomerName}
                    </Text>
                  </View>
                )}

                {addressOptionsLoading ? (
                  <View style={localStyles.assignmentEmptyState}>
                    <InlineLoadingText color={ppcColors.primary}>Carregando enderecos...</InlineLoadingText>
                  </View>
                ) : addressOptions.length > 0 ? (
                  addressOptions.map(address => {
                    const addressId = String(getEntityId(address) || '')
                    const addressIri = toEntityIri(address, 'addresses')
                    const summary = buildAddressOptionSummary(address)
                    const isCurrent = addressIri === selectedOrderAddressIri
                    const isSaving = addressSelectingId === addressId

                    return (
                      <TouchableOpacity
                        key={addressIri || addressId || summary.primary}
                        onPress={() => handleSelectAddress(address)}
                        disabled={!!addressSelectingId || addressSaveLoading}
                        style={[
                          localStyles.assignmentOptionCard,
                          isCurrent && localStyles.assignmentOptionCardSelected,
                        ]}
                      >
                        <View style={localStyles.assignmentOptionTextWrap}>
                          <Text style={localStyles.assignmentOptionTitle}>
                            {summary.primary || `Endereco #${addressId || '--'}`}
                          </Text>
                          {!!summary.secondary && (
                            <Text style={localStyles.assignmentOptionMeta}>
                              {summary.secondary}
                            </Text>
                          )}
                        </View>

                        {isSaving ? (
                          <InlineLoadingText color={ppcColors.primary}>...</InlineLoadingText>
                        ) : isCurrent ? (
                          <Text style={localStyles.assignmentOptionBadge}>Atual</Text>
                        ) : (
                          <Icon name="chevron-right" size={20} color={ppcColors.textSecondary} />
                        )}
                      </TouchableOpacity>
                    )
                  })
                ) : (
                  <View style={localStyles.assignmentEmptyState}>
                    <Text style={localStyles.assignmentEmptyStateTitle}>
                      Nenhum endereco encontrado
                    </Text>
                    <Text style={localStyles.assignmentEmptyStateText}>
                      Cadastre um endereco rapido para aplicar neste pedido.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={
                    addressModalMode === 'create'
                      ? () => setAddressModalMode('select')
                      : openAddressCreateMode
                  }
                  disabled={addressSaveLoading || !!addressSelectingId}
                  style={localStyles.assignmentQuickActionCard}
                >
                  <View style={localStyles.assignmentQuickActionHeader}>
                    <Icon name="add-location" size={18} color={ppcColors.accentInfo} />
                    <Text style={localStyles.assignmentQuickActionTitle}>
                      Cadastro rapido de endereco
                    </Text>
                  </View>
                  <Text style={localStyles.assignmentQuickActionText}>
                    {addressModalMode === 'create'
                      ? 'Ocultar o formulario rapido.'
                      : 'Crie um novo endereço sem sair do detalhe do pedido.'}
                  </Text>
                </TouchableOpacity>

                {addressModalMode === 'create' && (
                  <DefaultAddress
                    mode="create"
                    hideActions
                    row={addressForm}
                    onFormChange={next =>
                      setAddressForm(previousForm => ({
                        ...previousForm,
                        ...next,
                        state: next.uf || next.state || previousForm.state,
                        country: next.countryCode || next.country || previousForm.country,
                      }))
                    }
                  />
                )}
              </ScrollView>

              <View style={localStyles.deliveryCodeActions}>
                <TouchableOpacity
                  onPress={closeAddressModal}
                  disabled={addressSaveLoading || !!addressSelectingId}
                  style={[
                    localStyles.deliveryCodeButton,
                    localStyles.deliveryCodeButtonSecondary,
                  ]}
                >
                  <Text style={localStyles.deliveryCodeButtonSecondaryText}>
                    {global.t?.t('orders', 'button', 'close') || 'Fechar'}
                  </Text>
                </TouchableOpacity>

                {addressModalMode === 'create' && (
                  <TouchableOpacity
                    onPress={handleCreateAddress}
                    disabled={addressSaveLoading}
                    style={[
                      localStyles.deliveryCodeButton,
                      localStyles.deliveryCodeButtonPrimary,
                      addressSaveLoading && localStyles.kdsActionButtonDisabled,
                    ]}
                  >
                    {addressSaveLoading ? (
                      <InlineLoadingText color="#FFFFFF">Salvando...</InlineLoadingText>
                    ) : (
                      <Text style={localStyles.deliveryCodeButtonPrimaryText}>
                        Salvar endereco
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>

    </>
  );
}
