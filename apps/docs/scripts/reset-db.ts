import { nicelog } from '@/utils/nicelog'
import { connect } from './functions/connect'
;(async function () {
	nicelog('◦ Resetting database...')
	await connect({ reset: true, mode: 'readwrite' })
	nicelog('✔ Complete!')
	process.exit()
})()
