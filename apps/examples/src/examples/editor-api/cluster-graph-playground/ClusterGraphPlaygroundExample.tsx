import { defaultOverlayUtils, Tldraw, TLComponents } from 'tldraw'
import 'tldraw/tldraw.css'
import './cluster-graph-playground.css'
import { ClusterControlsPanel } from './ClusterControlsPanel'
import { ClusterGraphOverlayUtil } from './ClusterGraphOverlayUtil'
import { createDemoBoard } from './createDemoBoard'

// There's a guide at the bottom of this file!

// [1]
const overlayUtils = [...defaultOverlayUtils, ClusterGraphOverlayUtil]

// [2]
const components: TLComponents = {
	InFrontOfTheCanvas: ClusterControlsPanel,
	StylePanel: null,
}

export default function ClusterGraphPlaygroundExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="cluster-graph-playground"
				overlayUtils={overlayUtils}
				components={components}
				onMount={(editor) => {
					// [3]
					if (editor.getCurrentPageShapeIds().size === 0) createDemoBoard(editor)
				}}
			/>
		</div>
	)
}

/*
This playground turns the shapes on the page into a live cluster graph — the
kind of structure an agent-facing API could use to let an LLM navigate a board
by meaning instead of by raw coordinates.

Every top-level shape is a clusterable atom (frames and groups carry their
children with them). A union-find pass merges atoms by proximity (bounds-gap
or center distance within eps, with eps derived automatically from the page's
nearest-neighbor distances), by containment, and through arrow bindings.
Cluster centroids then become graph nodes connected by your choice of
proximity graph (Delaunay, Gabriel, relative neighborhood, MST, or kNN), and
arrows that span clusters become "semantic" edges. Each cluster is labeled
with c-TF-IDF keywords extracted from its text, preferring frame names.

Everything is tunable from the panel on the right. Hover a cluster hull to
highlight its graph neighborhood and preview the JSON payload an agent would
receive for that node.

The interesting files:

- `clustering.ts` — atoms, union-find linkage, auto-eps, binding modes,
  subclusters
- `graphs.ts` — Delaunay/Gabriel/RNG/MST/kNN edge builders
- `keywords.ts` — c-TF-IDF keyword extraction and cluster labeling
- `ClusterGraphOverlayUtil.ts` — canvas-overlay rendering and hover adjacency

[1]
The visualization is a custom `OverlayUtil` registered alongside the default
overlays. It renders with Canvas 2D in page space, so it stays in sync with
the camera and costs nothing in the React tree.

[2]
The control panel mounts into the `InFrontOfTheCanvas` slot and shares state
with the overlay util through a plain `atom` of settings. The default style
panel is hidden so it doesn't overlap the controls.

[3]
Seed a demo board (wireframes, sticky notes, a flowchart with bound arrows,
an annotation, and outliers) so there's something to cluster on first load.
*/
