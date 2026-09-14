import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { type Corpus } from '../../../semantic-zoom/layout'
import '../../../semantic-zoom/semantic-zoom.css'
import { createSemanticZoom } from '../../../semantic-zoom/SemanticZoom'
import { book } from './summaries'

interface Chapter {
	n: number
	text: string
}

// [1]
const mobyDick: Corpus = {
	root: book,
	async loadDetail() {
		const chapters = (await import('./chapters.json')).default as Chapter[]
		return Object.fromEntries(chapters.map((chapter) => [String(chapter.n), chapter.text]))
	},
}

// [2]
const { components, options, onMount } = createSemanticZoom(mobyDick)

export default function ZoomIntoMobyDickExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} options={options} onMount={onMount} />
		</div>
	)
}

/*
[1]
The corpus is the only Moby-Dick-specific thing here: a tree of summaries and a
function that fetches the real text. Everything that makes the zoom work lives
in `src/semantic-zoom` and has never heard of Melville — see the "Zoom into the
tldraw SDK" example for the same code over a codebase instead of a novel.

`loadDetail` is only called when someone zooms in far enough to need it, so the
1.2MB of chapters never loads for a visitor who just reads the summary.

[2]
`createSemanticZoom` lays the corpus out once, at module scope, and returns the
editor wiring. The layout is a pure function of content that never changes, so
computing it a second time would only duplicate work.
*/
