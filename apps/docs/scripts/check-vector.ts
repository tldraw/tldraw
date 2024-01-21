import { nicelog } from '@/utils/nicelog'
import { getVectorDbStats } from './functions/getVectorDbStats'
;(async function () {
	nicelog('• Checking vector db stats...')
	await getVectorDbStats()
	nicelog('✔ Complete!')
	process.exit()
})()
