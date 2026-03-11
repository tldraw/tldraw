import { TLComponents, Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './reactive-inputs.css'

// There's a guide at the bottom of this file!

// [1]
const components: TLComponents = {
	TopPanel: ReactiveInputsPanel,
}

export default function ReactiveInputsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

function formatNum(n: number, decimals: number): string {
	const s = n.toFixed(decimals)
	return n >= 0 ? ` ${s}` : s
}

// [2]
function ReactiveInputsPanel() {
	const editor = useEditor()

	// [3]
	const currentScreenPoint = useValue(
		'current screen point',
		() => editor.inputs.getCurrentScreenPoint(),
		[editor]
	)
	const currentPagePoint = useValue(
		'current page point',
		() => editor.inputs.getCurrentPagePoint(),
		[editor]
	)
	const previousScreenPoint = useValue(
		'previous screen point',
		() => editor.inputs.getPreviousScreenPoint(),
		[editor]
	)
	const previousPagePoint = useValue(
		'previous page point',
		() => editor.inputs.getPreviousPagePoint(),
		[editor]
	)
	const originScreenPoint = useValue(
		'origin screen point',
		() => editor.inputs.getOriginScreenPoint(),
		[editor]
	)
	const originPagePoint = useValue('origin page point', () => editor.inputs.getOriginPagePoint(), [
		editor,
	])
	const pointerVelocity = useValue('pointer velocity', () => editor.inputs.getPointerVelocity(), [
		editor,
	])

	// [4]
	const shiftKey = useValue('shift key', () => editor.inputs.getShiftKey(), [editor])
	const ctrlKey = useValue('ctrl key', () => editor.inputs.getCtrlKey(), [editor])
	const altKey = useValue('alt key', () => editor.inputs.getAltKey(), [editor])
	const metaKey = useValue('meta key', () => editor.inputs.getMetaKey(), [editor])
	const accelKey = useValue('accel key', () => editor.inputs.getAccelKey(), [editor])

	return (
		<div className="reactive-inputs-panel">
			<div className="reactive-inputs-content">
				{/* [5] */}
				<div className="input-group">
					<div className="input-label">Screen point</div>
					<div className="input-value">
						{formatNum(currentScreenPoint.x, 0)}, {formatNum(currentScreenPoint.y, 0)}
					</div>
				</div>

				<div className="input-group">
					<div className="input-label">Page point</div>
					<div className="input-value">
						{formatNum(currentPagePoint.x, 0)}, {formatNum(currentPagePoint.y, 0)}
					</div>
				</div>

				<div className="input-group">
					<div className="input-label">Prev screen</div>
					<div className="input-value">
						{formatNum(previousScreenPoint.x, 0)}, {formatNum(previousScreenPoint.y, 0)}
					</div>
				</div>

				<div className="input-group">
					<div className="input-label">Prev page</div>
					<div className="input-value">
						{formatNum(previousPagePoint.x, 0)}, {formatNum(previousPagePoint.y, 0)}
					</div>
				</div>

				<div className="input-group">
					<div className="input-label">Origin screen</div>
					<div className="input-value">
						{formatNum(originScreenPoint.x, 0)}, {formatNum(originScreenPoint.y, 0)}
					</div>
				</div>

				<div className="input-group">
					<div className="input-label">Origin page</div>
					<div className="input-value">
						{formatNum(originPagePoint.x, 0)}, {formatNum(originPagePoint.y, 0)}
					</div>
				</div>

				{/* [6] */}
				<div className="input-group">
					<div className="input-label">Velocity</div>
					<div className="input-value">
						{formatNum(pointerVelocity.x, 2)}, {formatNum(pointerVelocity.y, 2)}
						<span className="input-hint"> px/ms</span>
					</div>
				</div>

				<div className="input-group">
					<div className="input-label">Modifiers</div>
					<div className="modifier-keys">
						<span className="modifier-key" data-active={shiftKey}>
							Shift
						</span>
						<span className="modifier-key" data-active={ctrlKey}>
							Ctrl
						</span>
						<span className="modifier-key" data-active={altKey}>
							Alt
						</span>
						<span className="modifier-key" data-active={metaKey}>
							Meta
						</span>
						<span className="modifier-key" data-active={accelKey}>
							Accel
						</span>
					</div>
				</div>
			</div>
		</div>
	)
}
/*
[1]
Pass the ReactiveInputsPanel as a TopPanel component so it renders inside the
canvas UI. This keeps it visible without requiring a separate side panel layout.

[2]
The TopPanel component has access to the editor via the `useEditor` hook since
it renders inside the Tldraw component tree.

[3]
Use the `useValue` hook to subscribe to reactive input state. The hook takes three arguments:
- A name for debugging
- A function that returns the value to track
- Dependencies array (similar to useEffect)

The editor's inputs manager exposes several reactive properties:
- getCurrentScreenPoint() / getCurrentPagePoint() - Current pointer position
- getPreviousScreenPoint() / getPreviousPagePoint() - Previous pointer position
- getOriginScreenPoint() / getOriginPagePoint() - Position where pointer went down
- getPointerVelocity() - Pointer velocity in pixels per millisecond

All of these are backed by reactive atoms, so calling them inside a `useValue` callback will
automatically trigger updates when they change.

[4]
Modifier keys (shift, ctrl, alt, meta) are also backed by reactive atoms. The `getAccelKey()`
method returns the platform-appropriate accelerator key (cmd on Mac, ctrl elsewhere), which is
useful for implementing keyboard shortcuts that work across platforms.

[5]
Screen points are relative to the editor's container, while page points are in the canvas's
coordinate space (accounting for zoom and pan). The origin points track where the most recent
pointer down event occurred.

[6]
Pointer velocity is calculated and updated by the tick manager. It represents the speed and
direction of pointer movement in pixels per millisecond, useful for detecting quick gestures
or implementing physics-based interactions.

*/
