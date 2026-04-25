import {useMemo} from 'react';
import {useWindowDimensions} from 'react-native';
import {useDisplayTheme} from '@controleonline/ui-ppc/src/react/theme/displayTheme';
import createStyles from './orderDetails.styles';

export const useOrderDetailsVisuals = () => {
  const {ppcColors} = useDisplayTheme();
  const {width, height} = useWindowDimensions();

  const scale = useMemo(() => {
    if (width < 340) return 0.78;
    if (width < 380) return 0.84;
    if (width >= 1700) return 1.05;
    if (width >= 1300) return 0.97;
    return 0.92;
  }, [width]);

  const styles = useMemo(
    () => createStyles(scale, ppcColors, height, width),
    [scale, ppcColors, height, width],
  );

  return {
    ppcColors,
    scale,
    styles,
    width,
    windowHeight: height,
  };
};

export default useOrderDetailsVisuals;
