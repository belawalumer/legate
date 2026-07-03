import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '../../constants/theme';

export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalDocumentContent {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}

export default function LegalDocumentScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { content } = route.params as { content: LegalDocumentContent };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          ‹ Back
        </Text>
        <Text style={styles.headerTitle}>{content.title}</Text>
        <Text style={styles.headerSubtitle}>Last updated {content.lastUpdated}</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.intro}>{content.intro}</Text>

        {content.sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    backgroundColor: colors.navy,
    paddingTop: 36,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn: {
    color: colors.gold,
    fontSize: 15,
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 24,
    fontWeight: '400',
    color: colors.cream,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  intro: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 24,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeading: {
    fontFamily: 'serif',
    fontSize: 17,
    fontWeight: '400',
    color: colors.navy,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
