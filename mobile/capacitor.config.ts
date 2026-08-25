import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.sansayaw.app',
  appName: "sa'nsayaw",
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0C1D29',
      showSpinner: false,
    },
  },
};

export default config;
