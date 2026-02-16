import React from 'react';
import {Text, View} from 'react-native';

const ExtraDataHeader = ({extraData = [], styles}) => {
  if (!extraData?.length) return null;

  return (
    <View>
      {extraData.map(item => (
        <Text
          key={item.id}
          style={[styles.boxTextColor, styles.infoText]}>
          {item?.extra_fields?.context}: {item?.value}
        </Text>
      ))}
    </View>
  );
};

export default ExtraDataHeader;
