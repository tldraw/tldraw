import { nicelog } from '@/utils/nicelog'
import { checkBrokenLinks } from './lib/checkBrokenLinks'
;(async function () {
	const strict = process.argv.includes('--fail')
	nicelog('• Checking broken links...')
	const brokenCount = await checkBrokenLinks()
	if (brokenCount > 0) {
		if (strict) {
			process.exit(1)
		}
		nicelog('⚠ Run with --fail to treat broken links as errors.')
	} else {
		nicelog('✔ No broken links found!')
	}
	process.exit()
})()
