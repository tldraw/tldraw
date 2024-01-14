import { PurgeCSS } from 'purgecss'
import { nicelog } from './lib/nicelog'

async function main() {
	const purgeCSSResults = await new PurgeCSS().purge({
		content: ['packages/tldraw/**/*.tsx', 'packages/editor/**/*.tsx'],
		css: ['packages/tldraw/src/lib/ui.css'],
		rejected: true,
	})

	nicelog(purgeCSSResults)
}

main()
