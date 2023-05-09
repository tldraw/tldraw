const { BUILD_NAME } = require('./wdio.util')

global.webdriverService = 'browserstack'
global.webdriverTestUrl = 'http://localhost:5420/'

exports.config = {
	user: process.env.BROWSERSTACK_USER,
	key: process.env.BROWSERSTACK_KEY,
	hostname: 'hub.browserstack.com',
	specs: ['./test/specs/index.ts'],
	services: [
		[
			'browserstack',
			{
				browserstackLocal: true,
				opts: {
					verbose: 'true',
				},
			},
		],
	],
	exclude: [],
	maxInstances: 1,
	waitforInterval: 200,
	/**
	 * Capabilities can be configured via <https://www.browserstack.com/automate/capabilities>
	 *
	 * The once commented out currently fail on because of insecure certs, details <https://www.browserstack.com/guide/how-to-test-https-websites-from-localhost>
	 */
	capabilities: [
		/**
		 * ====================================================================
		 * Windows 11
		 * ====================================================================
		 */
		{
			'bstack:options': {
				os: 'Windows',
				osVersion: '11',
				browserVersion: 'latest',
				seleniumVersion: '3.14.0',
			},
			browserName: 'Chrome',
			'tldraw:options': {
				browser: 'chrome',
				os: 'windows',
				ui: 'desktop',
				device: 'desktop',
				input: ['mouse'],
			},
		},
		{
			'bstack:options': {
				os: 'Windows',
				osVersion: '11',
				browserVersion: 'latest',
				seleniumVersion: '4.6.0',
			},
			acceptInsecureCerts: 'true',
			browserName: 'Edge',
			'tldraw:options': {
				browser: 'edge',
				os: 'windows',
				ui: 'desktop',
				device: 'desktop',
				input: ['mouse'],
			},
		},
		{
			'bstack:options': {
				os: 'Windows',
				osVersion: '11',
				browserVersion: 'latest',
				seleniumVersion: '4.6.0',
			},
			acceptInsecureCerts: 'true',
			browserName: 'Firefox',
			'tldraw:options': {
				browser: 'firefox',
				os: 'windows',
				ui: 'desktop',
				device: 'desktop',
				input: ['mouse'],
			},
		},
		/**
		 * ====================================================================
		 * MacOS
		 * ====================================================================
		 */
		// {
		//     'bstack:options' : {
		//         "os" : "OS X",
		//         "osVersion" : "Ventura",
		//         "browserVersion" : "16.0",
		//         "seleniumVersion" : "4.6.0",
		//     },
		//     "acceptInsecureCerts" : "true",
		//     "browserName" : "Safari",
		// },
		{
			'bstack:options': {
				os: 'OS X',
				osVersion: 'Ventura',
				browserVersion: 'latest',
				seleniumVersion: '4.6.0',
			},
			browserName: 'Chrome',
			'tldraw:options': {
				browser: 'chrome',
				os: 'macos',
				ui: 'desktop',
				device: 'desktop',
				input: ['mouse'],
			},
		},
		{
			'bstack:options': {
				os: 'OS X',
				osVersion: 'Ventura',
				browserVersion: 'latest',
				seleniumVersion: '4.6.0',
			},
			acceptInsecureCerts: 'true',
			browserName: 'Firefox',
			'tldraw:options': {
				browser: 'firefox',
				os: 'macos',
				ui: 'desktop',
				device: 'desktop',
				input: ['mouse'],
			},
		},
		{
			'bstack:options': {
				os: 'OS X',
				osVersion: 'Ventura',
				browserVersion: 'latest',
				seleniumVersion: '4.6.0',
			},
			acceptInsecureCerts: 'true',
			browserName: 'Edge',
			'tldraw:options': {
				browser: 'edge',
				os: 'macos',
				ui: 'desktop',
				device: 'desktop',
				input: ['mouse'],
			},
		},
		/**
        //  * ====================================================================
        //  * Android
        //  * ====================================================================
        //  */
		{
			'bstack:options': {
				osVersion: '13.0',
				deviceName: 'Google Pixel 7',
				appiumVersion: '1.22.0',
			},
			browserName: 'chrome',
			'tldraw:options': {
				appium: true,
				browser: 'chrome',
				os: 'android',
				ui: 'mobile',
				device: 'mobile',
				input: ['touch'],
			},
		},
		{
			'bstack:options': {
				osVersion: '11.0',
				deviceName: 'Samsung Galaxy S21',
				appiumVersion: '1.22.0',
			},
			acceptInsecureCerts: 'true',
			browserName: 'samsung',
			'tldraw:options': {
				appium: true,
				browser: 'samsung',
				os: 'android',
				ui: 'mobile',
				device: 'mobile',
				input: ['touch'],
			},
		},
		{
			'bstack:options': {
				osVersion: '11.0',
				deviceName: 'Samsung Galaxy S21',
				appiumVersion: '1.22.0',
			},
			acceptInsecureCerts: 'true',
			browserName: 'chrome',
			'tldraw:options': {
				appium: true,
				browser: 'chrome',
				os: 'android',
				ui: 'mobile',
				device: 'mobile',
				input: ['touch'],
			},
		},
		/**
		 * ====================================================================
		 * iOS
		 * ====================================================================
		 */
		// {
		//     'bstack:options': {
		//         "osVersion" : "16",
		//         "deviceName" : "iPhone 14",
		//         "appiumVersion": "1.22.0"
		//     },
		//     "acceptInsecureCerts" : "true",
		//     "browserName" : "safari",
		// },
		// {
		//     'bstack:options': {
		//         "osVersion" : "16",
		//         "deviceName" : "iPad Pro 12.9 2022",
		//         "appiumVersion": "1.22.0"
		//     },
		//     "acceptInsecureCerts" : "true",
		//     "browserName" : "safari",
		// },
	].map((capability) => {
		return {
			...capability,
			acceptInsecureCerts: true,
			'bstack:options': {
				...capability['bstack:options'],
				projectName: 'tldraw',
				buildName: BUILD_NAME,
				consoleLogs: 'verbose',
				testObservability: true,
				testObservabilityOptions: {
					projectName: 'tldraw',
					buildName: BUILD_NAME,
					buildTag: process.env.GITHUB_SHA || 'local',
				},
			},
			'tldraw:options': {
				...capability['tldraw:options'],
			},
		}
	}),
	bail: 0,
	waitforTimeout: 10000,
	connectionRetryTimeout: 120000,
	connectionRetryCount: 3,
	framework: 'mocha',
	reporters: ['spec'],
	mochaOpts: {
		ui: 'bdd',
		timeout: 5 * 60 * 1000,
	},
	logLevel: process.env.WD_LOG_LEVEL ?? 'info',
	coloredLogs: true,
	screenshotPath: './errorShots/',
	waitforTimeout: 30000,
	connectionRetryTimeout: 90000,
	connectionRetryCount: 3,
	beforeSession: (_config, capabilities) => {
		global.tldrawOptions = capabilities['tldraw:options']
	},
	afterSession: async (_config, capabilities, _specs) => {
		const sessionId = capabilities['webdriver.remote.sessionid']

		const headers = new Headers()
		headers.set(
			'Authorization',
			'Basic ' + btoa(process.env.BROWSERSTACK_USER + ':' + process.env.BROWSERSTACK_KEY)
		)
		const resp = await fetch(`https://api.browserstack.com/automate/sessions/${sessionId}.json`, {
			method: 'GET',
			headers: headers,
		})
		const respJson = await resp.json()
		console.log(`==================================
browser_url: <${respJson.automation_session.browser_url}>
==================================`)
	},
	autoCompileOpts: {
		autoCompile: true,
		tsNodeOpts: {
			transpileOnly: true,
			swc: true,
			project: './tsconfig.json',
		},
	},
}
