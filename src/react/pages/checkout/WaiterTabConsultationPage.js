import React, {useMemo, useState} from 'react'
import {ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View} from 'react-native'
import {SafeAreaView} from 'react-native-safe-area-context'
import Formatter from '@controleonline/ui-common/src/utils/formatter'
import OrderProducts from '../../components/OrderProducts'
import {translateOrderStatus} from './linkedOrderSettlementHelpers'
import {normalizeEntityId} from '../../utils/linkedOrderContext'
import {isPendingCartOrder} from './pendingCartHelpers'
import useWaiterTabConsultation from './useWaiterTabConsultation'
import createStyles from './WaiterTabConsultation.styles'

function ConsultationButton({label, onPress, disabled, primary, busy, styles}) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{disabled: !!disabled, busy: !!busy}} disabled={!!disabled}
    onPress={onPress} style={[styles.button, primary && styles.primary, disabled && styles.disabled]}>
    {busy ? <ActivityIndicator /> : <Text style={[styles.buttonText, primary && styles.primaryText]}>{label}</Text>}
  </TouchableOpacity>
}

export function ConsultationRound({order, styles, palette, onOpenDraft, onDiscardDraft, disabled}) {
  const draft = isPendingCartOrder(order)
  return <View style={styles.card}>
    <Text style={styles.heading}>{draft ? 'Rascunho' : 'Lançamento'} #{normalizeEntityId(order)}</Text>
    <Text style={styles.muted}>{translateOrderStatus(order?.status?.status || order?.status?.realStatus)}
      {order.orderDate ? ` · ${Formatter.formatDateYmdTodmY(order.orderDate, true)}` : ''}</Text>
    <Text style={styles.text}>{Formatter.formatMoney(order.price || 0)}</Text>
    {Array.isArray(order.orderProducts) && <OrderProducts compactTree order={order} orderProducts={order.orderProducts} showDetails showImages
      showHierarchyGuides hierarchyGuideColor={palette.primary} hierarchySurfaceColor={palette.cardBackground}
      showRootStatusMarker={false} showGroupStatusMarker={false} />}
    {!Array.isArray(order.orderProducts) && <Text style={styles.muted}>Carregando itens…</Text>}
    {Array.isArray(order.orderProducts) && !order.orderProducts.length && <Text style={styles.muted}>Sem itens neste lançamento.</Text>}
    {draft && <ConsultationButton label="Revisar rascunho" onPress={() => onOpenDraft(order)} disabled={disabled} styles={styles} />}
    {draft && order.orderType === 'cart' && <ConsultationButton label="Descartar rascunho" onPress={() => onDiscardDraft(order)} disabled={disabled} styles={styles} />}
  </View>
}

export default function WaiterTabConsultationPage(props) {
  const [draftsExpanded, setDraftsExpanded] = useState(false)
  const view = useWaiterTabConsultation({...props, draftsExpanded})
  const styles = useMemo(() => createStyles(view.palette), [view.palette])
  const disabled = !view.fresh || !!view.busy
  return <SafeAreaView edges={['bottom']} style={styles.container}>
    <ScrollView contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={view.refreshing} onRefresh={view.refresh} />}>
      <View style={styles.panel}>
        {!!view.feedback && <Text accessibilityRole="alert" style={styles.text}>{view.feedback}</Text>}
        {!view.fresh && view.root && <Text style={styles.muted}>
          {view.refreshing ? 'Atualizando consumo…' : 'Dados da última consulta. Atualize antes de lançar ou cobrar.'}
        </Text>}
        {!view.root ? <View style={styles.card}>
          <Text style={styles.title}>Consultar comanda</Text>
          {view.refreshing ? <ActivityIndicator /> : <Text style={styles.text}>Não foi possível carregar a comanda.</Text>}
          <ConsultationButton label="Atualizar consulta" onPress={view.refresh} disabled={view.refreshing} styles={styles} />
          {!props.route?.params?.rootOrderId && <ConsultationButton label="Identificar comanda"
            onPress={() => props.navigation.navigate('HomePage')} styles={styles} />}
        </View> : <>
          <View style={styles.card}>
            <Text style={styles.title}>Comanda {view.code}</Text>
            <Text style={styles.muted}>Total da comanda</Text>
            <Text style={styles.total}>{Formatter.formatMoney(view.root.price || 0)}</Text>
            <View style={styles.metrics}>
              <Text style={styles.text}>Pago: {Formatter.formatMoney(view.invoiceSummary.paidAmount)}</Text>
              <Text style={styles.text}>Pendente: {Formatter.formatMoney(view.pending)}</Text>
            </View>
            {!!view.rounds.pendingCarts.length && <Text style={styles.muted}>
              Há rascunhos separados abaixo. O total segue o valor registrado pelo sistema.
            </Text>}
            {!view.open && <Text style={styles.muted}>Esta comanda está encerrada.</Text>}
          </View>
          <ConsultationButton label="Novo lançamento" onPress={view.launch} primary styles={styles}
            disabled={disabled || !view.open} busy={view.busy === 'launch'} />
          {view.canCharge ? <ConsultationButton label="Fechar comanda" onPress={view.close} styles={styles}
            busy={view.busy === 'close'} disabled={disabled || !view.open} />
            : <Text style={styles.muted}>Cobrança não autorizada neste device.</Text>}

          <View style={styles.section}>
            <Text style={styles.heading}>Lançamentos enviados ({view.rounds.sales.length})</Text>
            {view.rounds.sales.map(order => <ConsultationRound key={normalizeEntityId(order)} order={order}
              styles={styles} palette={view.palette} />)}
            {!view.rounds.sales.length && <Text style={styles.muted}>Nenhum lançamento enviado.</Text>}
          </View>
          {!!view.rounds.pendingCarts.length && <View style={styles.section}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Rascunhos (${view.rounds.pendingCarts.length})`}
              accessibilityState={{expanded: draftsExpanded}} onPress={() => setDraftsExpanded(value => !value)}
              style={styles.button}>
              <Text style={styles.buttonText}>Rascunhos ({view.rounds.pendingCarts.length}) {draftsExpanded ? '▴' : '▾'}</Text>
            </TouchableOpacity>
            {draftsExpanded && view.rounds.pendingCarts.map(order => <ConsultationRound key={normalizeEntityId(order)} order={order}
              styles={styles} palette={view.palette} onOpenDraft={view.openDraft} onDiscardDraft={view.discardDraft} disabled={disabled} />)}
          </View>}
          {!!view.rounds.other.length && <View style={styles.section}>
            <Text style={styles.heading}>Outros lançamentos vinculados</Text>
            {view.rounds.other.map(order => <ConsultationRound key={normalizeEntityId(order)} order={order} styles={styles} palette={view.palette} />)}
          </View>}
        </>}
      </View>
    </ScrollView>
  </SafeAreaView>
}
