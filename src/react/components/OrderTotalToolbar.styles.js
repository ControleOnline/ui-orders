import { StyleSheet } from 'react-native'

const createStyles = compact =>
  StyleSheet.create({
    valueText: {
      flex: 1,
      textAlign: 'center',
      fontSize: compact ? 18 : 20,
      lineHeight: compact ? 20 : 22,
      fontWeight: '900',
    },
  })

export default createStyles

export const inlineStyle_79_6 = {
  flex: 1,
};
