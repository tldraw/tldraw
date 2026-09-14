import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { type Corpus } from '../../../semantic-zoom/layout'
import '../../../semantic-zoom/semantic-zoom.css'
import { createSemanticZoom } from '../../../semantic-zoom/SemanticZoom'
import { sdk } from './sdk'

// [1]
const corpus: Corpus = {
	root: sdk,
	tintDepth: 1,
}

const { components, options, onMount } = createSemanticZoom(corpus, { divePathTo: 'shapes-arrow' })

export default function ZoomIntoTheSdkExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} options={options} onMount={onMount} />
		</div>
	)
}

/*
[1]
The same component as the "Zoom into Moby Dick" example, over a codebase instead
of a novel. The corpus here is smaller in every way — four levels rather than
six, no cross-references, and no `loadDetail`, because there is no deeper body
of text to fetch — and none of that needs a flag: a corpus without detail simply
has two fewer levels.

Cell area is proportional to the real line count of the source each node stands
for, so the shape of the map is the shape of the repository. The translations
being the single largest block is not an error.
*/
