import { useMemo } from 'react'
import {
	atom,
	createShapeId,
	Editor,
	Tldraw,
	TldrawUiButton,
	TLComponents,
	TLShapeId,
	toRichText,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './locked-shapes.css'

// There's a guide at the bottom of this file!

const TEMPLATE_IDS: TLShapeId[] = [
	createShapeId('t1'),
	createShapeId('t2'),
	createShapeId('t3'),
	createShapeId('t4'),
]

const HOME_POSITIONS = [
	{ x: 100, y: 100 },
	{ x: 250, y: 100 },
	{ x: 100, y: 250 },
	{ x: 250, y: 250 },
]

// [1]
const selectLockedShapes$ = atom('selectLockedShapes', false)

function ControlPanel() {
	const editor = useEditor()
	const selectLockedShapes = useValue(selectLockedShapes$)

	// [2]
	const moveTemplates = (positions: { x: number; y: number }[]) => {
		editor.run(
			() => {
				editor.updateShapes(TEMPLATE_IDS.map((id, i) => ({ id, type: 'geo', ...positions[i] })))
			},
			{ ignoreShapeLock: true }
		)
	}

	const handleScatter = () => {
		moveTemplates(
			TEMPLATE_IDS.map(() => ({ x: 50 + Math.random() * 300, y: 50 + Math.random() * 300 }))
		)
	}

	return (
		<div className="tlui-menu locked-shapes-panel">
			<label title="When on, left-click and brush selection include locked shapes.">
				<input
					type="checkbox"
					checked={selectLockedShapes}
					onChange={() => selectLockedShapes$.set(!selectLockedShapes)}
				/>
				Allow selecting locked shapes
			</label>
			<TldrawUiButton type="normal" onClick={handleScatter}>
				Scatter
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={() => moveTemplates(HOME_POSITIONS)}>
				Reset
			</TldrawUiButton>
		</div>
	)
}

const components: TLComponents = {
	TopPanel: ControlPanel,
}

// [3]
function handleMount(editor: Editor) {
	if (!editor.getShape(TEMPLATE_IDS[0])) {
		const props = {
			geo: 'rectangle' as const,
			w: 130,
			h: 130,
			dash: 'dashed' as const,
			color: 'light-blue' as const,
			fill: 'semi' as const,
			richText: toRichText('Locked'),
		}
		editor.createShapes(
			TEMPLATE_IDS.map((id, i) => ({ id, type: 'geo', ...HOME_POSITIONS[i], props }))
		)
		editor.toggleLock(TEMPLATE_IDS)
	}
	editor.zoomToFit({ animation: { duration: 0 } })
}

export default function LockedShapesExample() {
	const selectLockedShapes = useValue(selectLockedShapes$)
	const options = useMemo(() => ({ selectLockedShapes }), [selectLockedShapes])

	return (
		<div className="tldraw__editor">
			<Tldraw components={components} options={options} onMount={handleMount} />
		</div>
	)
}

/*
Locked shapes can't be moved, resized, edited, or deleted by the user. This example shows two ways the
editor lets you work around that:

- `editor.run(fn, { ignoreShapeLock: true })` lifts the lock guard for the duration of the callback, so
  code can move shapes the user can't drag.
- The `selectLockedShapes` editor option lets locked shapes be selected by left-click, brush, and
  scribble selection. Only selection changes; the lock guards still apply to everything else.

Try it: left-click a blue shape and nothing happens (right-click still selects it). Turn on "Allow
selecting locked shapes" and left-click or brush across one; it selects, but the handles won't move it.
Scatter and Reset move the shapes regardless of the toggle.

[1]
The toggle lives in a module-level `atom` so both the control panel (inside the editor) and the example
component (outside it) can read it with `useValue`. Editor options are read-only once the editor is
created, so the example passes a new `options` object to `<Tldraw>`, which recreates the editor with
the new setting. The store is preserved, so the shapes and camera survive the swap.

[2]
Both buttons wrap `updateShapes` in `editor.run` with `ignoreShapeLock: true`. Without it, updates to
locked shapes are silently dropped.

[3]
On mount, create a 2x2 grid of shapes and lock them with `toggleLock`. `onMount` runs again whenever the
editor is recreated, so it checks whether the shapes already exist first.
*/
