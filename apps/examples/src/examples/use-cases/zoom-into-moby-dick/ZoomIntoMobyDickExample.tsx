import { TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { bookBounds, nominalFonts } from './book'
import { BookLayer } from './BookLayer'
import { openingZoom } from './layout'
import './zoom-into-moby-dick.css'

// [1]
const components: TLComponents = {
	OnTheCanvas: BookLayer,
}

// [2]
const options = {
	camera: {
		zoomSteps: [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128],
	},
}

export default function ZoomIntoMobyDickExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={components}
				options={options}
				onMount={(editor) => {
					// [3]
					editor.zoomToBounds(bookBounds, { targetZoom: openingZoom(nominalFonts) })
				}}
			/>
		</div>
	)
}

/*
[1]
`OnTheCanvas` renders inside the layer that carries the camera transform, so the
book can be positioned in page coordinates and pans and zooms for free. It is
not in the store: 200,000 words of Melville have no business being records with
migrations and undo history, and keeping them out means every tldraw tool still
works normally on top of the text.

[2]
Reading the whole book takes roughly 90x of zoom, from the one-sentence summary
down to the set type of a chapter. The default zoom steps top out at 8x, so the
range has to be widened — the camera clamps to the first and last step.

[3]
Open on the most zoomed-out view that still has something to read: the whole
book as a single sentence, just before the six act summaries fade up under it.
*/
