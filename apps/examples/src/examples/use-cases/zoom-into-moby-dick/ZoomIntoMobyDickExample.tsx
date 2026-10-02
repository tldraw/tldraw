import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { type Corpus } from './layout'
import './zoom-into-moby-dick.css'
import { createSemanticZoom } from './SemanticZoom'
import { book } from './summaries'

interface Chapter {
	n: number
	text: string
}

// [1]
const mobyDick: Corpus = {
	root: book,
	// Median chapter, in characters. The deepest level is sized from this before
	// any of the text has been fetched.
	detailChars: 6768,
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
function that fetches the real text. Everything that makes the zoom work — the
layout, the level of detail, the navigation — takes that tree and has never
heard of Melville.

`loadDetail` is only called when someone zooms in far enough to need it, so the
1.2MB of chapters never loads for a visitor who just reads the summary.

[2]
`createSemanticZoom` lays the corpus out once, at module scope, and returns the
editor wiring. The layout is a pure function of content that never changes, so
computing it a second time would only duplicate work.
*/
