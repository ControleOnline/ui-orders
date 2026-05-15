import React from 'react'
import {Text, View} from 'react-native'

import OrderIdentityLabel from './OrderIdentityLabel'

const OrderCardHeader = ({
  order = null,
  leftContent = null,
  rightContent = null,
  status = null,
  dateText = '',
  dateTrailingContent = null,
  containerStyle = null,
  leftSectionStyle = null,
  identityContainerStyle = null,
  titleWrapStyle = null,
  primaryTextStyle = null,
  secondaryTextStyle = null,
  dateRowStyle = null,
  dateTextStyle = null,
  rightSectionStyle = null,
  statusBadgeStyle = null,
  statusDotStyle = null,
  statusTextStyle = null,
  showSecondaryIdentity = true,
}) => {
  const hasDateRow = !!dateText || !!dateTrailingContent
  const hasRightSection = !!status || !!rightContent

  return (
    <View style={containerStyle}>
      <View style={leftSectionStyle}>
        {leftContent}
        <View style={titleWrapStyle}>
          <OrderIdentityLabel
            order={order}
            containerStyle={identityContainerStyle}
            primaryTextStyle={primaryTextStyle}
            secondaryTextStyle={secondaryTextStyle}
            showSecondary={showSecondaryIdentity}
          />
          {hasDateRow && (
            <View style={dateRowStyle}>
              {!!dateText && (
                <Text style={dateTextStyle}>
                  {dateText}
                </Text>
              )}
              {dateTrailingContent}
            </View>
          )}
        </View>
      </View>

      {hasRightSection && (
        <View style={rightSectionStyle}>
          {!!status && (
            <View style={statusBadgeStyle}>
              <View style={statusDotStyle} />
              <Text style={statusTextStyle}>
                {status.label}
              </Text>
            </View>
          )}
          {rightContent}
        </View>
      )}
    </View>
  )
}

export default OrderCardHeader
