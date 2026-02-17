import { useState } from 'react'
import { Editor, Tldraw, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './reactive-inputs.css'

// There's a guide at the bottom of this file!

export default function ReactiveInputsExample() {
	const [editor, setEditor] = useState<Editor | null>(null)
	return (
		<div style={{ display: 'flex', height: '100vh' }}>
			<div style={{ flex: 1, minWidth: 0 }}>
				<Tldraw onMount={setEditor} />
				{editor && <ReactiveInputsPanel editor={editor} />}
			</div>
		</div>
	)
}

function ReactiveInputsPanel({ editor }: { editor: Editor }) {
	// [2]
	const currentScreenPoint = useValue(
		'current screen point',
		() => editor?.inputs.getCurrentScreenPoint(),
		[editor]
	)
	const currentPagePoint = useValue(
		'current page point',
		() => editor?.inputs.getCurrentPagePoint(),
		[editor]
	)
	const previousScreenPoint = useValue(
		'previous screen point',
		() => editor?.inputs.getPreviousScreenPoint(),
		[editor]
	)
	const previousPagePoint = useValue(
		'previous page point',
		() => editor?.inputs.getPreviousPagePoint(),
		[editor]
	)
	const originScreenPoint = useValue(
		'origin screen point',
		() => editor?.inputs.getOriginScreenPoint(),
		[editor]
	)
	const originPagePoint = useValue('origin page point', () => editor?.inputs.getOriginPagePoint(), [
		editor,
	])
	const pointerVelocity = useValue('pointer velocity', () => editor?.inputs.getPointerVelocity(), [
		editor,
	])

	return (
		<div className="reactive-inputs-panel">
			<h3>Reactive inputs</h3>
			<div className="reactive-inputs-content">
				{/* [3] */}
				<div className="input-group">
					<div className="input-label">Current screen point</div>
					<div className="input-value">
						x: {currentScreenPoint?.x.toFixed(2) ?? '0.00'}
						<br />
						y: {currentScreenPoint?.y.toFixed(2) ?? '0.00'}
					</div>
				</div>

				<div className="input-group">
					<div className="input-label">Current page point</div>
					<div className="input-value">
						x: {currentPagePoint?.x.toFixed(2) ?? '0.00'}
						<br />
						y: {currentPagePoint?.y.toFixed(2) ?? '0.00'}
					</div>
				</div>

				<div className="input-group">
					<div className="input-label">Previous screen point</div>
					<div className="input-value">
						x: {previousScreenPoint?.x.toFixed(2) ?? '0.00'}
						<br />
						y: {previousScreenPoint?.y.toFixed(2) ?? '0.00'}
					</div>
				</div>

				<div className="input-group">
					<div className="input-label">Previous page point</div>
					<div className="input-value">
						x: {previousPagePoint?.x.toFixed(2) ?? '0.00'}
						<br />
						y: {previousPagePoint?.y.toFixed(2) ?? '0.00'}
					</div>
				</div>

				<div className="input-group">
					<div className="input-label">Origin screen point</div>
					<div className="input-value">
						x: {originScreenPoint?.x.toFixed(2) ?? '0.00'}
						<br />
						y: {originScreenPoint?.y.toFixed(2) ?? '0.00'}
					</div>
				</div>

				<div className="input-group">
					<div className="input-label">Origin page point</div>
					<div className="input-value">
						x: {originPagePoint?.x.toFixed(2) ?? '0.00'}
						<br />
						y: {originPagePoint?.y.toFixed(2) ?? '0.00'}
					</div>
				</div>

				{/* [4] */}
				<div className="input-group">
					<div className="input-label">Pointer velocity</div>
					<div className="input-value">
						x: {pointerVelocity?.x.toFixed(4) ?? '0.0000'}
						<br />
						y: {pointerVelocity?.y.toFixed(4) ?? '0.0000'}
						<br />
						<span className="input-hint">px/ms</span>
					</div>
				</div>
			</div>
		</div>
	)
}
/*
[1]
Store the editor instance in React state so we can access it from the component.

[2]
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

[3]
Screen points are relative to the editor's container, while page points are in the canvas's
coordinate space (accounting for zoom and pan). The origin points track where the most recent
pointer down event occurred.

[4]
Pointer velocity is calculated and updated by the tick manager. It represents the speed and
direction of pointer movement in pixels per millisecond, useful for detecting quick gestures
or implementing physics-based interactions.
*/
