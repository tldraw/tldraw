import { nicelog } from '@/utils/nicelog'
import { createApiMarkdown } from './lib/createApiMarkdown'
;(async function () {
	nicelog('• Generating markdown files for API docs...')
	await createApiMarkdown()
	nicelog('✔ Complete!')
	process.exit()
})()
