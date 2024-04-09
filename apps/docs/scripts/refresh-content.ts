import { nicelog } from '@/utils/nicelog'
import { refreshContent } from './functions/refreshContent'
;(async function () {
	nicelog('◦ Refreshing all content')
	await refreshContent()
	process.exit()
})()
