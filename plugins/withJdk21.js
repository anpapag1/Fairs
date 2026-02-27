/**
 * Expo config plugin: ensures Gradle uses JDK 21 on this machine.
 * Prevents the "Error resolving plugin > 25.0.1" failure caused by
 * JDK 25 being the system default while RN's Gradle plugin only
 * accepts up to JDK 21.
 *
 * Also restores sdk.dir in local.properties (wiped by prebuild --clean).
 * Skips local path overrides when running on EAS Build servers.
 */
const { withGradleProperties, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const IS_EAS = !!process.env.EAS_BUILD;

const JDK_21_PATH = 'C:\\\\Program Files\\\\Eclipse Adoptium\\\\jdk-21.0.7.6-hotspot';
const ANDROID_SDK  = 'C:\\\\Users\\\\anton\\\\AppData\\\\Local\\\\Android\\\\Sdk';

// 1. Inject org.gradle.java.home into gradle.properties (local only)
const withJdk21GradleProperties = (config) =>
  withGradleProperties(config, (cfg) => {
    if (IS_EAS) return cfg;
    // Remove any existing java.home entry first to avoid duplicates
    cfg.modResults = cfg.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'org.gradle.java.home')
    );
    cfg.modResults.push({
      type: 'property',
      key: 'org.gradle.java.home',
      value: JDK_21_PATH,
    });
    return cfg;
  });

// 2. Restore local.properties (sdk.dir) — always wiped by --clean (local only)
const withLocalProperties = (config) =>
  withDangerousMod(config, [
    'android',
    (cfg) => {
      if (IS_EAS) return cfg;
      const localPropsPath = path.join(
        cfg.modRequest.platformProjectRoot,
        'local.properties'
      );
      const content = `sdk.dir=${ANDROID_SDK.replace(/\\\\/g, '\\\\')}\n`;
      fs.writeFileSync(localPropsPath, content, 'utf8');
      return cfg;
    },
  ]);

module.exports = (config) => {
  config = withJdk21GradleProperties(config);
  config = withLocalProperties(config);
  return config;
};
