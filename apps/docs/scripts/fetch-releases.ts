import { nicelog } from '@/utils/nicelog'
import { fetchReleases } from './functions/fetchReleases'
;(async function () {
	nicelog('• Fetching releases from GitHub...')
	await fetchReleases()
	nicelog('✔ Complete!')
	process.exit()
})()
