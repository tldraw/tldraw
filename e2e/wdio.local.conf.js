const edgeDriver = require('@sitespeed.io/edgedriver')

const CURRENT_OS = {
	win32: 'windows',
	linux: 'linux',
	darwin: 'macos',
}[process.platform]

global.webdriverService = 'local'
global.webdriverTestUrl = process.env.TEST_URL ?? 'http://localhost:5420/'

let capabilities
if (process.env.CI === 'true') {
	capabilities = [
		// {
		// 	maxInstances: 1,
		// 	browserName: 'chrome',
		// 	acceptInsecureCerts: true,
		// 	'goog:chromeOptions': {
		// 		mobileEmulation: {
		// 			deviceName: 'iPhone XR',
		// 		},
		// 		prefs: {
		// 			download: {
		// 				default_directory: __dirname + '/downloads/',
		// 				prompt_for_download: false,
		// 			},
		// 		},
		// 	},
		// 	'tldraw:options': {
		// 		browser: 'chrome',
		// 		os: CURRENT_OS,
		// 		ui: 'mobile',
		// 		device: 'mobile',
		// 		input: ['touch'],
		// 	},
		// },
		{
			maxInstances: 1,
			browserName: 'chrome',
			acceptInsecureCerts: true,
			'goog:chromeOptions': {
				prefs: {
					download: {
						default_directory: __dirname + '/downloads/',
						prompt_for_download: false,
					},
				},
			},
			'tldraw:options': {
				browser: 'chrome',
				os: CURRENT_OS,
				ui: 'desktop',
				device: 'desktop',
				input: ['mouse'],
			},
		},
	]
} else {
	capabilities = [
		{
			maxInstances: 1,
			browserName: 'chrome',
			acceptInsecureCerts: true,
			'goog:chromeOptions': {
				// Network emulation requires device mode, which is only enabled when mobile emulation is on
				mobileEmulation: {
					deviceName: 'iPhone XR',
				},
				prefs: {
					download: {
						default_directory: __dirname + '/downloads/',
						prompt_for_download: false,
					},
				},
			},
			'tldraw:options': {
				browser: 'chrome',
				os: CURRENT_OS,
				ui: 'mobile',
				device: 'mobile',
				input: ['touch'],
			},
		},
		{
			maxInstances: 1,
			browserName: 'vscode',
			browserVersion: 'stable',
			acceptInsecureCerts: true,
			'wdio:vscodeOptions': {
				extensionPath: __dirname + '../bublic/apps/vscode/extension/dist/web',
				userSettings: {
					'editor.fontSize': 14,
				},
			},
			'tldraw:options': {
				browser: 'vscode',
				os: CURRENT_OS,
				ui: 'desktop',
				device: 'desktop',
				input: ['mouse'],
				windowSize: 'default',
			},
		},
		{
			maxInstances: 1,
			browserName: 'chrome',
			acceptInsecureCerts: true,
			'goog:chromeOptions': {
				prefs: {
					download: {
						default_directory: __dirname + '/downloads/',
						prompt_for_download: false,
					},
				},
			},
			'tldraw:options': {
				browser: 'chrome',
				os: CURRENT_OS,
				ui: 'desktop',
				device: 'desktop',
				input: ['mouse'],
			},
		},
		{
			maxInstances: 1,
			browserName: 'safari',
			acceptInsecureCerts: true,
			'tldraw:options': {
				browser: 'safari',
				os: CURRENT_OS,
				ui: 'desktop',
				device: 'desktop',
				input: ['mouse'],
			},
		},
		{
			maxInstances: 1,
			browserName: 'firefox',
			acceptInsecureCerts: true,
			'tldraw:options': {
				browser: 'firefox',
				os: CURRENT_OS,
				ui: 'desktop',
				device: 'desktop',
				input: ['mouse'],
			},
		},
		{
			maxInstances: 1,
			browserName: 'MicrosoftEdge',
			acceptInsecureCerts: true,
			'tldraw:options': {
				browser: 'edge',
				os: CURRENT_OS,
				ui: 'desktop',
				device: 'desktop',
				input: ['mouse'],
			},
		},
	]
}

let browsers = (process.env.BROWSERS || 'chrome').split(',').map((b) => b.trim())
const validBrowsers = ['chrome', 'safari', 'firefox', 'edge', 'vscode']
const skippedBrowsers = []

if (browsers.includes('safari')) {
	console.log(
		'NOTE: In safari you need to run `safaridriver --enable`, see <https://developer.apple.com/documentation/webkit/testing_with_webdriver_in_safari> for details.'
	)
}

for (const browser of browsers) {
	if (!validBrowsers.includes(browser)) {
		throw new Error(`'${browser}' not a valid browser name`)
	}
	if (skippedBrowsers.includes(browser)) {
		console.error(`'${browser}' not currently supported`)
	}
}

capabilities = capabilities.filter((capability) => {
	return browsers.includes(capability['tldraw:options'].browser)
})

exports.config = {
	specs: ['./test/specs/index.ts'],
	hostname: process.env.DOCKER_HOST || 'localhost',
	exclude: [],
	services: process.env.DOCKER_HOST
		? []
		: [
				['vscode', { verboseLogging: true }],
				[
					'geckodriver',
					{
						outputDir: './driver-logs',
						logFileName: 'wdio-geckodriver.log',
					},
				],
				[
					'safaridriver',
					{
						outputDir: './driver-logs',
						logFileName: 'wdio-safaridriver.log',
					},
				],
				[
					'chromedriver',
					{
						logFileName: 'wdio-chromedriver.log',
						outputDir: './driver-logs',
						args: ['--silent'],
						// NOTE: Must be on a different port that 7676 otherwise it conflicts with 'vscode' service.
						port: 7677,
					},
				],
				// HACK: If we don't have edge as a capability but we do have
				// this service then `wdio-edgedriver-service` throws an scary
				// error (which doesn't actually effect anything)
				...(!browsers.includes('edge')
					? []
					: [
							[
								'edgedriver',
								{
									port: 17556, // default for EdgeDriver
									logFileName: 'wdio-edgedriver.log',
									outputDir: './driver-logs',
									edgedriverCustomPath: edgeDriver.binPath(),
								},
							],
					  ]),
		  ],
	maxInstances: 1,
	capabilities: capabilities,
	logLevel: process.env.WD_LOG_LEVEL ?? 'error',
	bail: 0,
	baseUrl: 'http://localhost',
	waitforTimeout: 10000,
	connectionRetryTimeout: 120000,
	connectionRetryCount: 3,
	framework: 'mocha',
	reporters: ['spec'],
	mochaOpts: {
		ui: 'bdd',
		timeout: 60000,
	},
	beforeSession: (_config, capabilities) => {
		global.tldrawOptions = capabilities['tldraw:options']
	},
	autoCompileOpts: {
		autoCompile: true,
		tsNodeOpts: {
			transpileOnly: true,
			project: './tsconfig.json',
		},
	},
}
