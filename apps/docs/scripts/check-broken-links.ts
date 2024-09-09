import { nicelog } from '@/utils/nicelog'
import { checkBrokenLinks } from './lib/checkBrokenLinks'
;(async function () {
	nicelog('• Checking broken links...')
	await checkBrokenLinks()
	nicelog('✔ Complete!')
	process.exit()
})()
