import { nicelog } from '@/utils/nicelog'
import { checkBrokenLinks } from './lib/checkBrokenLinks'
;(async function () {
	nicelog('• Checking broken links...')
	const brokenCount = await checkBrokenLinks()
	if (brokenCount > 0) {
		process.exit(1)
	}
	nicelog('✔ No broken links found!')
	process.exit()
})()
