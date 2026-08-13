import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.sansayaw.app',
  appName: "sa'nsayaw",
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0b0b12',
      showSpinner: false,
    },
  },
};

export default config;
