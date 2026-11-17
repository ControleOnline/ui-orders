import React from 'react'
import {Image, Text, TextInput, TouchableOpacity, View} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import Formatter from '@controleonline/ui-common/src/utils/formatter'
import {resolveProductCoverUrl} from '@controleonline/ui-products/src/react/domain/productMedia'

export default function OrderItemsProductSearch({
  localStyles,
  ppcColors,
  productSearchText,
  setProductSearchText,
  productSearchLoading,
  productSearchResults,
  productSearchSelectionId,
  onCustomizeProduct,
  onQuickAddProduct,
}) {
  return (
        <View style={localStyles.detailsProductSearchStack}>
          <View
            style={[
              localStyles.assignmentSearchBox,
              localStyles.detailsProductSearchBox,
            ]}
            >
            <Icon name="search" size={18} color={ppcColors.textSecondary} />
            <TextInput
              value={productSearchText}
              onChangeText={setProductSearchText}
              placeholder="Pesquisar e adicionar produto"
              placeholderTextColor={ppcColors.textSecondary}
              autoCapitalize="none"
              returnKeyType="search"
              style={localStyles.assignmentSearchInput}
            />
            {productSearchLoading && (
              <Text style={localStyles.assignmentOptionBadge}>
                {global.t?.t('orders', 'label', 'loading') || 'Buscando'}
              </Text>
            )}
          </View>

          {String(productSearchText || '').trim().length >= 2 && (
            <View style={localStyles.detailsProductSearchResults}>
              {Array.isArray(productSearchResults) && productSearchResults.length > 0 ? (
                productSearchResults.map(product => {
                  const productId = String(product?.id || product?.['@id'] || '')
                  const isSelecting = productSearchSelectionId === productId
                  const coverUrl = resolveProductCoverUrl(product)
                  const isCustomProduct =
                    String(product?.type || '').trim() === 'custom'

                  return (
                    <TouchableOpacity
                      key={productId || product?.sku || product?.product}
                      onPress={() =>
                        isCustomProduct
                          ? onCustomizeProduct?.(product)
                          : onQuickAddProduct?.(product)
                      }
                      disabled={isSelecting}
                      style={[
                        localStyles.assignmentOptionCard,
                        localStyles.detailsProductSearchResultCard,
                        isSelecting && localStyles.inlineActionButtonDisabled,
                      ]}
                    >
                      <View style={localStyles.detailsProductSearchThumb}>
                        {coverUrl ? (
                          <Image
                            source={{uri: coverUrl}}
                            resizeMode="cover"
                            style={localStyles.detailsProductSearchImage}
                          />
                        ) : (
                          <Icon name="image" size={20} color={ppcColors.textSecondary} />
                        )}
                      </View>
                      <View style={localStyles.assignmentOptionTextWrap}>
                        <Text
                          style={localStyles.assignmentOptionTitle}
                          numberOfLines={1}
                        >
                          {product?.product || 'Produto sem nome'}
                        </Text>
                        <Text
                          style={localStyles.detailsProductSearchPrice}
                          numberOfLines={1}
                        >
                          {Formatter.formatMoney(product?.price || 0)}
                        </Text>
                      </View>
                      {isSelecting ? (
                        <Text style={localStyles.assignmentOptionBadge}>
                          {global.t?.t('orders', 'label', 'loading') || 'Carregando'}
                        </Text>
                      ) : isCustomProduct ? (
                        <View style={localStyles.detailsProductSearchCustomButton}>
                          <Text style={localStyles.detailsProductSearchCustomText}>
                            CUSTOMIZAR
                          </Text>
                        </View>
                      ) : (
                        <Icon name="add-circle" size={20} color={ppcColors.accentInfo} />
                      )}
                    </TouchableOpacity>
                  )
                })
              ) : !productSearchLoading ? (
                <View style={localStyles.assignmentEmptyState}>
                  <Text style={localStyles.assignmentEmptyStateTitle}>
                    Nenhum produto encontrado
                  </Text>
                  <Text style={localStyles.assignmentEmptyStateText}>
                    Refine o nome ou SKU para encontrar o produto que deseja adicionar.
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
  )
}
