import { useState } from 'react'
import { Tldraw, toRichText, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import { Model3dShapeUtil } from './Model3dShapeUtil'
import { makeReal3d } from './makeReal3d'

// There's a guide at the bottom of this file!

const customShapeUtils = [Model3dShapeUtil]

// [1]
function MakeRealButton() {
	const editor = useEditor()
	const [busy, setBusy] = useState(false)

	return (
		<button
			style={{
				position: 'absolute',
				top: 12,
				left: '50%',
				transform: 'translateX(-50%)',
				zIndex: 1000,
				pointerEvents: 'all',
				padding: '8px 14px',
				borderRadius: 8,
				border: 'none',
				background: busy ? '#b8860b' : '#2b2b2b',
				color: 'white',
				font: '600 13px system-ui, sans-serif',
				cursor: busy ? 'default' : 'pointer',
				boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
			}}
			disabled={busy}
			onClick={async () => {
				setBusy(true)
				try {
					await makeReal3d(editor)
				} finally {
					setBusy(false)
				}
			}}
		>
			{busy ? 'Making…' : 'Make 3D real ✦'}
		</button>
	)
}

export default function Make3dRealExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="make-3d-real"
				shapeUtils={customShapeUtils}
				onMount={(editor) => {
					// seed a couple of notes so the example is usable right away
					if (editor.getCurrentPageShapes().length > 0) return
					editor.createShapes([
						{
							type: 'note',
							x: 100,
							y: 120,
							props: { richText: toRichText('a low-poly potted cactus'), color: 'green' },
						},
						{
							type: 'note',
							x: 340,
							y: 120,
							props: {
								richText: toRichText('ligne claire style, flat colors, black outlines'),
								color: 'yellow',
							},
						},
						{
							type: 'note',
							x: 100,
							y: 360,
							props: { richText: toRichText('slowly rotating, terracotta pot'), color: 'orange' },
						},
					])
					editor.selectAll()
					editor.zoomToFit()
				}}
			>
				<MakeRealButton />
			</Tldraw>
		</div>
	)
}

/*
[1]
MakeRealButton renders inside <Tldraw>, so it can call useEditor() to reach the
editor. It gathers the current selection (notes, stickies, images — plus an
existing 3D asset if you want to iterate) and hands it to makeReal3d, which
prompts Claude for a React Three Fiber scene and drops the result on the canvas
as a custom `model-3d` shape.

Select the seeded notes and click "Make 3D real". To iterate, select the
generated asset together with a new note (e.g. "make it bigger and blue") and
click again — the shape updates in place.

This example calls the Anthropic API directly from the browser with a key you
paste in (stored in localStorage for the demo). That's fine for local
experimentation but not for production — proxy the request through a server so
your key isn't exposed.
*/
