let BUILD_NAME = 'e2e'
if (process.env.GH_EVENT_NAME === 'pull_request') {
	BUILD_NAME += `-pr-${process.env.GH_PR_NUMBER}`
} else if (process.env.WB_BUILD_NAME) {
	BUILD_NAME += `-${process.env.WB_BUILD_NAME}`
}

module.exports = { BUILD_NAME }
