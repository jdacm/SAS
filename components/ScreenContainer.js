import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScreenContainer({ children, style }) {
  const { width } = useWindowDimensions();
  let paddingHorizontal = 16;
  if (width >= 1200) paddingHorizontal = 64;
  else if (width >= 900) paddingHorizontal = 48;
  else if (width >= 600) paddingHorizontal = 30;

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: '#f8fafc', paddingHorizontal, paddingTop: 18 }, style]}>
      {children}
    </SafeAreaView>
  );
}
