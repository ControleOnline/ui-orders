import React from 'react'
import {Text, TouchableOpacity, View} from 'react-native'

const OrderSectionTabs = ({
  tabs = [],
  activeKey = '',
  onChange,
  styles = {},
}) => {
  const visibleTabs = Array.isArray(tabs) ? tabs.filter(tab => !!tab?.key) : []
  const activeTab =
    visibleTabs.find(tab => tab.key === activeKey) || visibleTabs[0] || null

  if (!activeTab) {
    return null
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {visibleTabs.map(tab => {
          const isActive = tab.key === activeTab.key
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onChange?.(tab.key)}
              style={[
                styles.tabButton,
                isActive && styles.tabButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  isActive && styles.tabButtonTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={styles.contentWrap}>{activeTab.content}</View>
    </View>
  )
}

export default OrderSectionTabs
