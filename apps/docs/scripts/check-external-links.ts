import { nicelog } from '@/utils/nicelog'
import { checkExternalLinks } from './lib/checkExternalLinks'
;(async function () {
	nicelog('• Checking external links...')
	const brokenCount = await checkExternalLinks()
	if (brokenCount > 0) {
		nicelog(`⚠ ${brokenCount} broken external link${brokenCount === 1 ? '' : 's'} found.`)
	}
	process.exit(brokenCount > 0 ? 1 : 0)
})()
