import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {useNavigation, useRoute} from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import {api} from '@controleonline/ui-common/src/api'

/**
 * Order NF screen: list existing invoice taxes for the order and emit NFC-e (model 65).
 * Backend: POST /orders/{id}/nfe { model: "65" } → invoice_tax id; download via /invoice_taxes/{id}/download.
 */
const OrderNfPage = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const orderId = String(route?.params?.id || '').replace(/\D+/g, '')

  const [loading, setLoading] = useState(true)
  const [emitting, setEmitting] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [lastEmit, setLastEmit] = useState(null)

  const title = useMemo(
    () => global.t?.t('orders', 'title', 'orderNf') || 'Nota fiscal do pedido',
    [],
  )

  const load = useCallback(async () => {
    if (!orderId) {
      setError('Pedido inválido')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      // order_invoice_taxes filtered by order — API Platform collection
      const res = await api.get('/order_invoice_taxes', {
        params: { order: orderId, itemsPerPage: 50 },
      })
      const list = Array.isArray(res?.['hydra:member'])
        ? res['hydra:member']
        : Array.isArray(res?.member)
          ? res.member
          : Array.isArray(res)
            ? res
            : []
      setItems(list)
    } catch (e) {
      setError(e?.message || String(e))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    load()
  }, [load])

  const handleEmitCupom = useCallback(async () => {
    if (!orderId || emitting) return
    setEmitting(true)
    setError('')
    setLastEmit(null)
    try {
      const res = await api.post(`/orders/${orderId}/nfe`, {model: '65'})
      const body = res?.response || res || {}
      if (body.success === false) {
        throw new Error(body.error || 'Falha ao emitir cupom fiscal')
      }
      setLastEmit(body)
      await load()
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setEmitting(false)
    }
  }, [emitting, load, orderId])

  const handleDownload = useCallback(
    (invoiceTaxId, format = 'pdf') => {
      if (!invoiceTaxId) return
      // Open download endpoint (browser / webview handles content-disposition)
      const path = `invoice_taxes/${invoiceTaxId}/download-nf?format=${format}`
      if (typeof global?.openAuthenticatedUrl === 'function') {
        global.openAuthenticatedUrl(path)
        return
      }
      navigation.navigate('EntityLogPage', {id: invoiceTaxId, store: 'invoice_taxes'})
    },
    [navigation],
  )

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={22} color="#0F172A" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Pedido #{orderId || '—'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#0EA5E9" style={{marginTop: 24}} />
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {lastEmit?.invoice_tax ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              Cupom emitido · NF #{lastEmit.invoice_number || lastEmit.invoice_tax}
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Emitir cupom fiscal (NFC-e)</Text>
          <Text style={styles.cardHint}>
            Modelo 65. Requer certificado digital e configuração fiscal da empresa
            (série, ambiente, regime).
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Emitir cupom fiscal NFC-e"
            disabled={!orderId || emitting}
            onPress={handleEmitCupom}
            style={[styles.primaryBtn, (!orderId || emitting) && styles.btnDisabled]}
          >
            {emitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Emitir NFC-e</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Notas vinculadas</Text>
        {items.length === 0 && !loading ? (
          <Text style={styles.empty}>Nenhuma NF vinculada a este pedido.</Text>
        ) : null}
        {items.map((row, idx) => {
          const tax = row?.invoiceTax || row?.invoice_tax || {}
          const taxId = tax?.id || tax
          const number = tax?.invoiceNumber || tax?.invoice_number || '—'
          const type = row?.invoiceType || row?.invoice_type || '—'
          return (
            <View key={String(row?.id || taxId || idx)} style={styles.row}>
              <View style={{flex: 1, minWidth: 0}}>
                <Text style={styles.rowTitle}>NF #{number}</Text>
                <Text style={styles.rowMeta}>Modelo {type} · id {String(taxId)}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleDownload(taxId, 'pdf')}
                style={styles.secondaryBtn}
              >
                <Icon name="picture-as-pdf" size={18} color="#0EA5E9" />
                <Text style={styles.secondaryBtnText}>PDF</Text>
              </Pressable>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#F8FAFC'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {flex: 1, minWidth: 0},
  title: {fontSize: 16, fontWeight: '800', color: '#0F172A'},
  subtitle: {fontSize: 12, color: '#64748B', marginTop: 2},
  content: {padding: 16, paddingBottom: 40},
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {color: '#B91C1C', fontSize: 13},
  successBox: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  successText: {color: '#047857', fontSize: 13, fontWeight: '600'},
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 18,
  },
  cardTitle: {fontSize: 15, fontWeight: '800', color: '#0F172A'},
  cardHint: {fontSize: 12, color: '#64748B', marginTop: 6, marginBottom: 14},
  primaryBtn: {
    backgroundColor: '#0EA5E9',
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {color: '#fff', fontWeight: '800', fontSize: 14},
  btnDisabled: {opacity: 0.55},
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  empty: {color: '#94A3B8', fontSize: 13},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 8,
  },
  rowTitle: {fontSize: 14, fontWeight: '700', color: '#0F172A'},
  rowMeta: {fontSize: 11, color: '#64748B', marginTop: 2},
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
  },
  secondaryBtnText: {color: '#0284C7', fontWeight: '700', fontSize: 12},
})

export default OrderNfPage
