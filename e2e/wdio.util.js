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

module.exports = { BUILD_NAME }
