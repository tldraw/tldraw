import { refreshContent } from './refresh-content-fn'

refreshContent({ silent: false })
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
