import { connect } from './lib/connect'
import { loadCollections } from './lib/loadCollections'
import { loadPages } from './lib/loadPages'

function nicelog(...args: unknown[]) {
	// eslint-disable-next-line no-console
	console.log(...args)
}

export async function refreshContent(opts = {} as { silent: boolean }) {
	if (!opts.silent) nicelog('◦ Resetting database...')
	const db = await connect({ reset: true, mode: 'readwrite' })

	if (!opts.silent) nicelog('◦ Loading pages...')
	await loadPages(db)

	if (!opts.silent) nicelog('◦ Loading collections...')
	await loadCollections(db)

	if (!opts.silent) nicelog('✔ Content refresh complete')
}
