import { TLComponents, Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './reactive-inputs.css'

// There's a guide at the bottom of this file!

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

function ReactiveInputsPanel() {
	const editor = useEditor()

	// [1]
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

	// [2]
	const shiftKey = useValue('shift key', () => editor.inputs.getShiftKey(), [editor])
	const ctrlKey = useValue('ctrl key', () => editor.inputs.getCtrlKey(), [editor])
	const altKey = useValue('alt key', () => editor.inputs.getAltKey(), [editor])
	const metaKey = useValue('meta key', () => editor.inputs.getMetaKey(), [editor])
	const accelKey = useValue('accel key', () => editor.inputs.getAccelKey(), [editor])

	return (
		<div className="tlui-menu reactive-inputs-panel">
			<div className="reactive-inputs-content">
				{/* [3] */}
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

				{/* [4] */}
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
`editor.inputs` exposes pointer state through getters (`getCurrentPagePoint()`, `getOriginScreenPoint()`,
and so on) that read reactive atoms. Reading them inside `useValue` subscribes the component, so it
re-renders whenever the pointer moves. Reading them outside a reactive context still works but won't
update the UI.

[2]
Modifier keys are reactive too. `getAccelKey()` is the platform accelerator (Cmd on Mac, Ctrl elsewhere),
which is what you want for cross-platform shortcuts.

[3]
Screen points are relative to the editor's container. Page points are in canvas coordinates, so they
account for the camera's pan and zoom. Origin points are where the last pointer down happened.

[4]
Pointer velocity is updated by the tick manager, in pixels per millisecond. It's useful for detecting
flicks or driving physics-style interactions.
*/
