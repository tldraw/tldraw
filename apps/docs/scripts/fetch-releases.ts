import { nicelog } from '@/utils/nicelog'
import { fetchReleases } from './lib/fetchReleases'
;(async function () {
	nicelog('• Fetching releases from GitHub...')
	await fetchReleases()
	nicelog('✔ Complete!')
	process.exit()
})()
