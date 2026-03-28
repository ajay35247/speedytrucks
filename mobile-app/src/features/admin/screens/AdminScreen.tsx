import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Screen from '../../../components/common/Screen';
import Card from '../../../components/common/Card';
import SectionHeader from '../../../components/common/SectionHeader';
import { Colors } from '../../../theme/colors';

export default function AdminScreen() {
  return (
    <Screen>
      <SectionHeader title="Admin console" subtitle="Use the web dashboard for deeper operational workflows." />
      <Card>
        <Text style={styles.text}>Review users, loads, trips, fraud alerts, and settlements from the admin web app.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { color: Colors.text, lineHeight: 22 },
});
