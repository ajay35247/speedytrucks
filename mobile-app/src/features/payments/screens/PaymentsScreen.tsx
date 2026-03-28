import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Screen from '../../../components/common/Screen';
import Card from '../../../components/common/Card';
import SectionHeader from '../../../components/common/SectionHeader';
import InfoRow from '../../../components/common/InfoRow';
import { Colors } from '../../../theme/colors';

export default function PaymentsScreen() {
  return (
    <Screen>
      <SectionHeader title="Payments" subtitle="Razorpay order creation and settlement APIs are wired on the backend." />
      <Card>
        <InfoRow label="Wallet balance" value="Dynamic API integration pending wallet endpoint" />
        <InfoRow label="Payout mode" value="Bank / UPI settlement" />
        <InfoRow label="Gateway" value="Razorpay" />
      </Card>
      <Card>
        <Text style={styles.heading}>Production notes</Text>
        <Text style={styles.item}>• Create Razorpay order on backend</Text>
        <Text style={styles.item}>• Verify webhook signature on backend</Text>
        <Text style={styles.item}>• Release payouts after trip completion checks</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontWeight: '700', fontSize: 16, color: Colors.text },
  item: { color: Colors.text, lineHeight: 22 },
});
