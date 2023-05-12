let BUILD_NAME = 'e2e'
if (process.env.GH_EVENT_NAME === 'pull_request') {
	BUILD_NAME += `-pr-${process.env.GH_PR_NUMBER}`
} else if (process.env.WB_BUILD_NAME) {
	BUILD_NAME += `-${process.env.WB_BUILD_NAME}`
}

async function logBrowserstackUrl() {
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
}

function filterCapabilities(capabilities) {
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

	// let oses = (process.env.OS || process.platform).split(',').map((b) => b.trim())
	// const validOses = ['darwin', 'win32', 'linux']

	// for (const os of oses) {
	// 	if (!validOses.includes(os)) {
	// 		throw new Error(`'${os}' not a valid OS name`)
	// 	}
	// }

	const filterFn = (capability) => {
		return browsers.includes(capability['tldraw:options'].browser)
		// oses.includes(capability['tldraw:options'].os)
	}

	return capabilities.filter(filterFn)
}

module.exports = { BUILD_NAME, logBrowserstackUrl, filterCapabilities }
