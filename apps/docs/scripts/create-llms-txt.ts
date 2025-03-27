import { nicelog } from '@/utils/nicelog'
import { connect } from './lib/connect'
import { generateLlmsTxt } from './lib/generateLllmsTxt'
;(async function () {
	const db = await connect({ mode: 'readonly' })

	nicelog('• Generating llms.txt...')
	await generateLlmsTxt(db)
	nicelog('✔ Complete!')
	process.exit()
})()
