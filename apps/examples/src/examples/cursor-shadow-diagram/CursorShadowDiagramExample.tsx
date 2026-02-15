import './cursor-shadow-diagram.css'

const PI = Math.PI

// [1]
const CORNER_PATH_WHITE =
	'm19.7432 17.0869-4.072 4.068 2.829 2.828-8.473-.013-.013-8.47 2.841 2.842 4.075-4.068 1.414-1.415-2.844-2.842h8.486v8.484l-2.83-2.827z'
const CORNER_PATH_BLACK =
	'm18.6826 16.7334-4.427 4.424 1.828 1.828-5.056-.016-.014-5.054 1.842 1.841 4.428-4.422 2.474-2.475-1.844-1.843h5.073v5.071l-1.83-1.828z'

const ANGLES = [0, 90, 180, 270] as const

// [2]
function CursorIcon({ rotation, counterRotate }: { rotation: number; counterRotate: boolean }) {
	let dx = 1
	let dy = 1
	if (counterRotate) {
		const a = -rotation * (PI / 180)
		dx = Math.cos(a) - Math.sin(a)
		dy = Math.sin(a) + Math.cos(a)
	}

	const filterId = `shadow-${rotation}-${counterRotate}`
	const svg = `
		<defs>
			<filter id="${filterId}" y="-40%" x="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">
				<feDropShadow dx="${dx}" dy="${dy}" stdDeviation="1.2" flood-opacity=".5"/>
			</filter>
		</defs>
		<g fill="none" transform="rotate(${rotation} 16 16)" filter="url(#${filterId})">
			<path d="${CORNER_PATH_WHITE}" fill="#fff"/>
			<path d="${CORNER_PATH_BLACK}" fill="#000"/>
		</g>`

	return (
		<svg
			width={96}
			height={96}
			viewBox="0 0 32 32"
			xmlns="http://www.w3.org/2000/svg"
			dangerouslySetInnerHTML={{ __html: svg }}
		/>
	)
}

export default function CursorShadowDiagramExample() {
	return (
		<div className="cursor-diagram">
			<div className="cursor-diagram-grid">
				{/* Column headers */}
				<div />
				{ANGLES.map((angle) => (
					<div key={angle} className="cursor-diagram-header">
						{angle}°
					</div>
				))}

				{/* Row 1: naive shadow (rotates with cursor) */}
				<div className="cursor-diagram-label">
					<strong>Shadow rotates with cursor</strong>
					<span>Naive — shadow direction drifts</span>
				</div>
				{ANGLES.map((angle) => (
					<div key={angle} className="cursor-diagram-cell">
						<CursorIcon rotation={angle} counterRotate={false} />
					</div>
				))}

				{/* Row 2: counter-rotated shadow (always down-right) */}
				<div className="cursor-diagram-label">
					<strong>Shadow stays down-right</strong>
					<span>Correct — shadow is counter-rotated</span>
				</div>
				{ANGLES.map((angle) => (
					<div key={angle} className="cursor-diagram-cell">
						<CursorIcon rotation={angle} counterRotate={true} />
					</div>
				))}
			</div>
		</div>
	)
}

/*
[1]
The diagonal resize cursor paths from tldraw's useCursor.ts. The white path
is the outline, the black path is the fill. This is the "corner" cursor
(nwse-resize / nesw-resize) — the most visually clear for showing rotation.

[2]
Renders a cursor SVG at the given rotation angle. When counterRotate is false,
the shadow offset is a fixed (1, 1) in SVG-local space, so it rotates with
the cursor. When counterRotate is true, the offset is pre-rotated by the
negative of the angle so the shadow always falls down-right in screen space.

This is the same math as tldraw's getCursorCss:
  const a = (-tr - r) * (PI / 180)
  const dx = cos(a) - sin(a)
  const dy = sin(a) + cos(a)
*/
