import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'com.packsil.com',
	appName: 'packsil',
	webDir: 'build',
	server: {
		// url: 'http://172.20.10.8:5173/', // !IMPORTANT: remove on deployment
		url: 'https://172.20.10.8:60000/',
		cleartext: true,
		androidScheme: 'https'
	},
	plugins: {
		SplashScreen: {
			launchShowDuration: 2000,
			backgroundColor: '#34495e',
			showSpinner: false
		},
		StatusBar: {
			backgroundColor: '#34495e',
			style: 'light'
		}
	}
};

export default config;
