import React, {useMemo} from 'react'
import {Text, View} from 'react-native'

import {resolveOrderIdentity} from '@controleonline/ui-orders/src/react/utils/orderIdentity'

const OrderIdentityLabel = ({
  order = null,
  remoteSummary = null,
  containerStyle = null,
  primaryTextStyle = null,
  secondaryTextStyle = null,
  numberOfLines = undefined,
  showSecondary = true,
}) => {
  const identity = useMemo(
    () => resolveOrderIdentity(order, remoteSummary),
    [order, remoteSummary],
  )

  return (
    <View style={containerStyle}>
      <Text numberOfLines={numberOfLines} style={primaryTextStyle}>
        {identity.primaryText}
      </Text>
      {showSecondary && !!identity.secondaryText && (
        <Text style={secondaryTextStyle}>
          {identity.secondaryText}
        </Text>
      )}
    </View>
  )
}

export default OrderIdentityLabel
