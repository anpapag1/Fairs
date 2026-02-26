import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ACCENT } from '../context/ThemeContext';

// ─────────────────────────────────────────────────────────────
// AppModal — shared modal shell used across the whole app.
// Edit overlay darkness, corner radius, shadows, typography,
// button shape, and field styles all in one place.
// ─────────────────────────────────────────────────────────────

// Overlay + card chrome
const OVERLAY_COLOR     = 'rgba(0, 0, 0, 0.65)';
const CARD_RADIUS       = 32;
const CARD_PADDING      = 28;

// Shadow
const SHADOW_OFFSET     = { width: 0, height: 16 };
const SHADOW_OPACITY    = 0.18;
const SHADOW_RADIUS     = 28;
const SHADOW_ELEVATION  = 16;

// Confirm button
const CONFIRM_RADIUS    = 30;
const CONFIRM_PADDING_V = 18;

// Field typography
const LABEL_FONT_SIZE   = 11;
const LABEL_SPACING     = 0.8;
const INPUT_FONT_SIZE   = 16;
const INPUT_RADIUS      = 14;
const INPUT_PADDING     = 16;

// ─────────────────────────────────────────────────────────────
// Shared field styles — import these alongside AppModal so
// label + input appearance also lives in one place.
// ─────────────────────────────────────────────────────────────
export const fieldStyles = StyleSheet.create({
  inputLabel: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: LABEL_FONT_SIZE,
    fontWeight: '700',
    letterSpacing: LABEL_SPACING,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    fontFamily: 'Ysabeau-Regular',
    borderRadius: INPUT_RADIUS,
    padding: INPUT_PADDING,
    fontSize: INPUT_FONT_SIZE,
    marginBottom: 4,
  },
});

// ─────────────────────────────────────────────────────────────
// AppModal component
//
// Props:
//   visible       – boolean
//   onClose       – () => void   called by backdrop tap & X btn
//   title         – string
//   confirmLabel  – string  (default "Confirm")
//   onConfirm     – () => void
//   children      – form fields / custom content
// ─────────────────────────────────────────────────────────────
export default function AppModal({
  visible,
  onClose,
  title,
  confirmLabel = 'Confirm',
  onConfirm,
  children,
}) {
  const { theme } = useTheme();

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              shadowColor: theme.shadow,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {title}
            </Text>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: theme.outlineVariant }]} />

          {/* Content */}
          {children}

          {/* Confirm button */}
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: ACCENT }]}
            onPress={onConfirm}
          >
            <Text style={[styles.confirmText, { color: theme.onPrimary }]}>
              {confirmLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: OVERLAY_COLOR,
  },
  card: {
    width: '88%',
    borderRadius: CARD_RADIUS,
    padding: CARD_PADDING,
    shadowOffset: SHADOW_OFFSET,
    shadowOpacity: SHADOW_OPACITY,
    shadowRadius: SHADOW_RADIUS,
    elevation: SHADOW_ELEVATION,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Ysabeau-Bold',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginBottom: 5,
  },
  confirmBtn: {
    borderRadius: CONFIRM_RADIUS,
    paddingVertical: CONFIRM_PADDING_V,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmText: {
    fontFamily: 'Ysabeau-SemiBold',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
