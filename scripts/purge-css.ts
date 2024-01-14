import { PurgeCSS } from 'purgecss'

async function main() {
	const purgeCSSResults = await new PurgeCSS().purge({
		content: ['packages/tldraw/**/*.tsx', 'packages/editor/**/*.tsx'],
		css: ['packages/tldraw/src/ui.css', 'packages/editor/editor.css'],
		rejected: true,
	})
	console.log(purgeCSSResults)
}

main()
