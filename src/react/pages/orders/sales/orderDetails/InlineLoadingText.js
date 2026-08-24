import React from 'react';
import {Text} from 'react-native';

export function InlineLoadingText({children, color, style}) {
  return <Text style={[{color, fontSize: 13}, style]}>{children}</Text>;
}

export default InlineLoadingText;
