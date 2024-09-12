import { nicelog } from '@/utils/nicelog'
import { connect } from './lib/connect'
;(async function () {
	nicelog('◦ Resetting database...')
	await connect({ reset: true, mode: 'readwrite' })
	nicelog('✔ Complete!')
	process.exit()
})()
