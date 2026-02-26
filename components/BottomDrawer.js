import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const SCREEN_H = Dimensions.get('window').height;

/**
 * Reusable bottom-sheet drawer.
 *
 * Props:
 *   visible          {boolean}  - controlled visibility from parent
 *   onClose          {function} - called AFTER close animation finishes
 *   children         {node}     - sheet content (no handle needed inside)
 *   maxHeightPercent {number}   - 0–1, default 0.85
 */
export default function BottomDrawer({ visible, onClose, children, maxHeightPercent = 0.85 }) {
  const { theme } = useTheme();

  // Keep the Modal mounted through the close animation
  const [internalVisible, setInternalVisible] = useState(false);
  const slideY = useRef(new Animated.Value(SCREEN_H)).current;
  const isClosing = useRef(false);

  // --- Animations ---
  const animateOpen = () => {
    slideY.setValue(SCREEN_H);
    Animated.spring(slideY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
  };

  const animateClose = () => {
    if (isClosing.current) return;
    isClosing.current = true;
    Animated.timing(slideY, {
      toValue: SCREEN_H,
      duration: 240,
      useNativeDriver: true,
    }).start(() => {
      isClosing.current = false;
      setInternalVisible(false);
      onClose();
    });
  };

  // React to parent toggling `visible`
  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      setInternalVisible(true);
    } else if (internalVisible && !isClosing.current) {
      animateClose();
    }
  }, [visible]);

  // Once modal is mounted, run open animation
  useEffect(() => {
    if (internalVisible) {
      setTimeout(animateOpen, 16);
    }
  }, [internalVisible]);

  // --- Drag to dismiss ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8 && gs.dy > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) slideY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || gs.vy > 0.5) {
          animateClose();
        } else {
          Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={internalVisible}
      onRequestClose={animateClose}
    >
      {/* Backdrop — tap to close */}
      <Pressable style={styles.backdrop} onPress={animateClose} />

      {/* Sheet */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.sheet,
          {
            backgroundColor: theme.surface,
            maxHeight: SCREEN_H * maxHeightPercent,
            transform: [{ translateY: slideY }],
          },
        ]}
        onStartShouldSetResponder={() => true}
      >
        {/* Drag handle */}
        <View style={styles.handleArea}>
          <View style={[styles.handle, { backgroundColor: theme.outlineVariant }]} />
        </View>

        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingBottom: 24,
  },
  handleArea: {
    paddingTop: 12,
    paddingBottom: 4,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
});
