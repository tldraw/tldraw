import { addAuthors } from '@/utils/addAuthors'
import { addContentToDb, addFTS } from '@/utils/addContent'
import { autoLinkDocs } from '@/utils/autoLinkDocs'
import { nicelog } from '@/utils/nicelog'
import { connect } from './connect'
import { generateApiContent } from './generateApiContent'
import { generateContent } from './generateContent'
import { generateExamplesContent } from './generateExamplesContent'

export async function refreshContent(opts = {} as { silent: boolean }) {
	if (!opts.silent) nicelog('◦ Resetting database...')
	const db = await connect({ reset: true, mode: 'readwrite' })

	if (!opts.silent) nicelog('◦ Adding authors to db...')
	await addAuthors(db, await require('../../content/authors.json'))

	if (!opts.silent) nicelog('◦ Generating / adding regular content to db...')
	await addContentToDb(db, await generateContent())

	if (!opts.silent) nicelog('◦ Generating / adding Examples content to db...')
	await addContentToDb(db, await generateExamplesContent())

	if (!opts.silent) nicelog('◦ Generating / adding API content to db...')
	await addContentToDb(db, await generateApiContent())

	if (!opts.silent) nicelog('◦ Adding full-text search...')
	await addFTS(db)

	if (!opts.silent) nicelog('◦ Fixing links to API docs...')
	await autoLinkDocs(db)

	if (!opts.silent) nicelog('✔ Complete')
}
