import { useEffect, useState } from 'react'
import { Tldraw, TldrawUiButton, createShapeId, react, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './cursor-shadow-rotation.css'

const PI = Math.PI

// [1]
const CORNER_SVG = `<path d='m19.7432 17.0869-4.072 4.068 2.829 2.828-8.473-.013-.013-8.47 2.841 2.842 4.075-4.068 1.414-1.415-2.844-2.842h8.486v8.484l-2.83-2.827z' fill='%23fff'/><path d='m18.6826 16.7334-4.427 4.424 1.828 1.828-5.056-.016-.014-5.054 1.842 1.841 4.428-4.422 2.474-2.475-1.844-1.843h5.073v5.071l-1.83-1.828z' fill='%23000'/>`
const EDGE_SVG = `<path d='m9 17.9907v.005l5.997 5.996.001-3.999h1.999 2.02v4l5.98-6.001-5.98-5.999.001 4.019-2.021.002h-2l.001-4.022zm1.411.003 3.587-3.588-.001 2.587h3.5 2.521v-2.585l3.565 3.586-3.564 3.585-.001-2.585h-2.521l-3.499-.001-.001 2.586z' fill='%23fff'/><path d='m17.4971 18.9932h2.521v2.586l3.565-3.586-3.565-3.585v2.605h-2.521-3.5v-2.607l-3.586 3.587 3.586 3.586v-2.587z' fill='%23000'/>`
const ROTATE_CORNER_SVG = `<path d="M22.4789 9.45728L25.9935 12.9942L22.4789 16.5283V14.1032C18.126 14.1502 14.6071 17.6737 14.5675 22.0283H17.05L13.513 25.543L9.97889 22.0283H12.5674C12.6071 16.5691 17.0214 12.1503 22.4789 12.1031L22.4789 9.45728Z" fill="black"/><path fill-rule="evenodd" clip-rule="evenodd" d="M21.4789 7.03223L27.4035 12.9945L21.4789 18.9521V15.1868C18.4798 15.6549 16.1113 18.0273 15.649 21.0284H19.475L13.5128 26.953L7.55519 21.0284H11.6189C12.1243 15.8155 16.2679 11.6677 21.4789 11.1559L21.4789 7.03223ZM22.4789 12.1031C17.0214 12.1503 12.6071 16.5691 12.5674 22.0284H9.97889L13.513 25.543L17.05 22.0284H14.5675C14.5705 21.6896 14.5947 21.3558 14.6386 21.0284C15.1157 17.4741 17.9266 14.6592 21.4789 14.1761C21.8063 14.1316 22.1401 14.1069 22.4789 14.1032V16.5284L25.9935 12.9942L22.4789 9.45729L22.4789 12.1031Z" fill="white"/>`

type DemoMode = 'correct' | 'no-rotation' | 'naive-shadow'

// [2]
function makeCursorCss(
	svg: string,
	r: number,
	tr: number,
	color: string,
	hotspotX = 16,
	hotspotY = 16
) {
	return (
		`url("data:image/svg+xml,<svg height='32' width='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' style='color: ${color};'><defs><filter id='shadow' y='-40%' x='-40%' width='180px' height='180%' color-interpolation-filters='sRGB'><feDropShadow dx='1' dy='1' stdDeviation='1.2' flood-opacity='.5'/></filter></defs><g fill='none' transform='rotate(${r + tr} 16 16)' filter='url(%23shadow)'>` +
		svg.replaceAll(`"`, `'`) +
		`</g></svg>") ${hotspotX} ${hotspotY}, pointer`
	)
}

// [3]
const NAIVE_SHADOW_CURSORS: Record<string, (r: number, c: string) => string> = {
	'ew-resize': (r, c) => makeCursorCss(EDGE_SVG, r, 0, c),
	'ns-resize': (r, c) => makeCursorCss(EDGE_SVG, r, 90, c),
	'nesw-resize': (r, c) => makeCursorCss(CORNER_SVG, r, 0, c),
	'nwse-resize': (r, c) => makeCursorCss(CORNER_SVG, r, 90, c),
	'nwse-rotate': (r, c) => makeCursorCss(ROTATE_CORNER_SVG, r, 0, c),
	'nesw-rotate': (r, c) => makeCursorCss(ROTATE_CORNER_SVG, r, 90, c),
	'senw-rotate': (r, c) => makeCursorCss(ROTATE_CORNER_SVG, r, 180, c),
	'swne-rotate': (r, c) => makeCursorCss(ROTATE_CORNER_SVG, r, 270, c),
}

// [4]
const NO_ROTATION_CURSORS: Record<string, (c: string) => string> = {
	'ew-resize': (c) => makeCursorCss(EDGE_SVG, 0, 0, c),
	'ns-resize': (c) => makeCursorCss(EDGE_SVG, 0, 90, c),
	'nesw-resize': (c) => makeCursorCss(CORNER_SVG, 0, 0, c),
	'nwse-resize': (c) => makeCursorCss(CORNER_SVG, 0, 90, c),
	'nwse-rotate': (c) => makeCursorCss(ROTATE_CORNER_SVG, 0, 0, c),
	'nesw-rotate': (c) => makeCursorCss(ROTATE_CORNER_SVG, 0, 90, c),
	'senw-rotate': (c) => makeCursorCss(ROTATE_CORNER_SVG, 0, 180, c),
	'swne-rotate': (c) => makeCursorCss(ROTATE_CORNER_SVG, 0, 270, c),
}

function radiansToDegrees(r: number) {
	return r * (180 / PI)
}

// [5]
const HANDLE_CURSOR_TYPES: [string, string][] = [
	['selection.resize.top', 'ns-resize'],
	['selection.resize.bottom', 'ns-resize'],
	['selection.resize.left', 'ew-resize'],
	['selection.resize.right', 'ew-resize'],
	['selection.target.top-left', 'nwse-resize'],
	['selection.target.top-right', 'nesw-resize'],
	['selection.target.bottom-right', 'nwse-resize'],
	['selection.target.bottom-left', 'nesw-resize'],
	['selection.rotate.top-left', 'nwse-rotate'],
	['selection.rotate.top-right', 'nesw-rotate'],
	['selection.rotate.bottom-left', 'swne-rotate'],
	['selection.rotate.bottom-right', 'senw-rotate'],
]

// [6]
function CursorOverride({ mode }: { mode: DemoMode }) {
	const editor = useEditor()

	useEffect(() => {
		if (mode === 'correct') return

		const container = editor.getContainer()
		const styleEl = document.createElement('style')
		container.appendChild(styleEl)

		const unsub = react('cursor-override', () => {
			const { type, rotation } = editor.getInstanceState().cursor
			const isDarkMode = editor.user.getIsDarkMode()
			const color = isDarkMode ? 'white' : 'black'

			// Override active (drag) cursors via CSS variable
			if (mode === 'no-rotation') {
				const fn = NO_ROTATION_CURSORS[type]
				if (fn) {
					container.style.setProperty('--tl-cursor', fn(color))
				}
			} else {
				const fn = NAIVE_SHADOW_CURSORS[type]
				if (fn) {
					container.style.setProperty('--tl-cursor', fn(radiansToDegrees(rotation), color))
				}
			}

			// Override hover cursors on handle elements via injected CSS
			const selectionRotation = radiansToDegrees(editor.getSelectionRotation())
			let css = ''
			for (const [testId, cursorType] of HANDLE_CURSOR_TYPES) {
				let cursorCss: string | undefined
				if (mode === 'no-rotation') {
					cursorCss = NO_ROTATION_CURSORS[cursorType]?.(color)
				} else {
					cursorCss = NAIVE_SHADOW_CURSORS[cursorType]?.(selectionRotation, color)
				}
				if (cursorCss) {
					css += `[data-testid="${testId}"] { cursor: ${cursorCss} !important; }\n`
				}
			}
			styleEl.textContent = css
		})

		return () => {
			unsub()
			styleEl.remove()
		}
	}, [editor, mode])

	return null
}

const MODE_INFO: Record<DemoMode, { label: string; hint: string }> = {
	correct: {
		label: 'Correct (default)',
		hint: "Cursors rotate with the shape and shadows always point down-right. This is tldraw's default.",
	},
	'no-rotation': {
		label: 'No rotation (broken)',
		hint: 'Cursors stay fixed regardless of shape rotation. The arrows no longer match the handle direction.',
	},
	'naive-shadow': {
		label: 'Naive shadow (broken)',
		hint: 'Cursors rotate correctly but shadows rotate too. Hover over the bottom handles to see shadows point upward.',
	},
}

const MODES: DemoMode[] = ['correct', 'no-rotation', 'naive-shadow']

function Controls({ mode, onSetMode }: { mode: DemoMode; onSetMode: (m: DemoMode) => void }) {
	return (
		<div className="tlui-menu cursor-shadow-controls">
			<div className="cursor-shadow-buttons">
				{MODES.map((m) => (
					<TldrawUiButton
						key={m}
						type="normal"
						onClick={() => onSetMode(m)}
						className={mode === m ? 'cursor-shadow-active' : ''}
					>
						{MODE_INFO[m].label}
					</TldrawUiButton>
				))}
			</div>
			<span className="cursor-shadow-hint">{MODE_INFO[mode].hint}</span>
		</div>
	)
}

const shapeId = createShapeId('demo')

export default function CursorShadowRotationExample() {
	const [mode, setMode] = useState<DemoMode>('correct')

	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					editor.createShapes([
						{
							id: shapeId,
							type: 'geo',
							x: 200,
							y: 100,
							rotation: PI,
							props: { w: 300, h: 200 },
						},
					])
					editor.select(shapeId)
					editor.zoomToSelection({ animation: { duration: 0 } })
				}}
				components={{
					TopPanel: () => <Controls mode={mode} onSetMode={setMode} />,
				}}
			>
				<CursorOverride mode={mode} />
			</Tldraw>
		</div>
	)
}

/*
[1]
These are the same SVG path strings from tldraw's useCursor.ts. Each cursor
has a white outline and a black fill so it stays visible on any background.

[2]
Builds a cursor CSS value from an SVG string. The shadow offset is always
dx=1, dy=1 in SVG-local space. This is the "naive" approach—fine for
unrotated cursors, but the shadow rotates with the cursor graphic.

Compare with tldraw's real getCursorCss which counter-rotates the offset:
  const a = (-tr - r) * (PI / 180)
  const dx = cos(a) - sin(a)
  const dy = sin(a) + cos(a)

[3]
Naive shadow cursors: the cursor graphic rotates with the shape (r is the
shape's rotation), but the shadow offset stays fixed in SVG space, so it
rotates too. At 180 degrees the shadow points upward instead of downward.

[4]
No-rotation cursors: always pass 0 for the shape rotation. The cursor
stays at its base orientation regardless of how the shape is rotated.
This makes the mismatch obvious—a handle at the visual "top" of a rotated
shape still shows a cursor pointing in the wrong direction.

[5]
Maps each selection handle (by data-testid) to its cursor type. Used to
override hover cursors on the handle SVG elements, which are set via the
cursor attribute in TldrawSelectionForeground, independently of --tl-cursor.

[6]
Overrides cursors in two layers based on the selected mode:
- Active (drag) cursors: overrides the --tl-cursor CSS variable
- Hover cursors: injects a <style> element with !important rules targeting
  each handle element by data-testid, overriding the inline SVG cursor
  attribute set by TldrawSelectionForeground's getCursor() calls.

In 'correct' mode, the component does nothing and tldraw's default
behavior takes over. The injected stylesheet is cleaned up on unmount.
*/
