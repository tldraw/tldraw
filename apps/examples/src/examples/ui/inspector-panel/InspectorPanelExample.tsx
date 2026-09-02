import { useState } from 'react'
import {
	Editor,
	EditorProvider,
	SharedStyle,
	StyleProp,
	TLBinding,
	TLShapeId,
	Tldraw,
	useColorMode,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './inspector-panel.css'

// There's a guide at the bottom of this file!

function InspectorPanel() {
	const editor = useEditor()

	// [1]
	const selectedShapes = useValue('selected shapes', () => editor.getSelectedShapes(), [editor])
	const sharedStyles = useValue('shared styles', () => editor.getSharedStyles(), [editor])
	const bindings = useValue(
		'bindings',
		() => {
			const only = editor.getOnlySelectedShape()
			return only ? editor.getBindingsInvolvingShape(only.id) : []
		},
		[editor]
	)

	if (selectedShapes.length === 0) {
		return (
			<div className="inspector-panel">
				<h3>Inspector</h3>
				<p>No shape selected</p>
			</div>
		)
	}

	if (selectedShapes.length > 1) {
		return (
			<div className="inspector-panel">
				<h3>Inspector</h3>
				{sharedStyles.size > 0 && (
					<div className="inspector-section">
						<h4>Shared styles</h4>
						{Array.from(sharedStyles.entries()).map(([styleProp, sharedStyle]) => (
							<SharedStyleRow key={styleProp.id} styleProp={styleProp} sharedStyle={sharedStyle} />
						))}
					</div>
				)}
				<p>{selectedShapes.length} shapes selected</p>
			</div>
		)
	}

	const [selectedShape] = selectedShapes
	const { props, ...rest } = selectedShape

	return (
		<div className="inspector-panel">
			<h3>Inspector</h3>
			<div className="inspector-section">
				{Object.entries(rest).map(([key, value]) => (
					<PropertyRow key={key} name={key} value={value} />
				))}
			</div>

			{Object.keys(props).length > 0 && (
				<div className="inspector-section">
					<h4>Shape props</h4>
					{Object.entries(props).map(([key, value]) => (
						<PropertyRow key={key} name={key} value={value} />
					))}
				</div>
			)}

			{bindings.length > 0 && (
				<div className="inspector-section">
					<h4>Bindings ({bindings.length})</h4>
					{bindings.map((binding) => (
						<BindingRow key={binding.id} binding={binding} selectedShapeId={selectedShape.id} />
					))}
				</div>
			)}
		</div>
	)
}

// [2]
function SharedStyleRow({
	styleProp,
	sharedStyle,
}: {
	styleProp: StyleProp<unknown>
	sharedStyle: SharedStyle<unknown>
}) {
	const isMixed = sharedStyle.type === 'mixed'
	return (
		<div className="property-row">
			<span className="property-name">{styleProp.id.replace('tldraw:', '')}:</span>
			<span className={`property-value ${isMixed ? 'mixed-style' : 'shared-style'}`}>
				{isMixed ? '(mixed)' : formatValue(sharedStyle.value)}
			</span>
		</div>
	)
}

function formatValue(val: unknown): string {
	if (val === null || val === undefined) return String(val)
	if (typeof val === 'string') return `"${val}"`
	if (Array.isArray(val)) return `Array(${val.length})`
	if (typeof val === 'object') return `Object(${Object.keys(val).length} keys)`
	return String(val)
}

function PropertyRow({ name, value }: { name: string; value: unknown }) {
	const [isExpanded, setIsExpanded] = useState(false)
	const isObject = value !== null && typeof value === 'object'

	if (!isObject) {
		return (
			<div className="property-row">
				<span className="property-name">{name}:</span>
				<span className="property-value">{formatValue(value)}</span>
			</div>
		)
	}

	return (
		<div className="property-row">
			<div className="property-row-header">
				<span className="property-name">{name}:</span>
				<button
					className="toggle-button"
					onClick={() => setIsExpanded(!isExpanded)}
					title={isExpanded ? 'Collapse' : 'Expand'}
				>
					{isExpanded ? '−' : '+'}
				</button>
				<span className="property-value">{formatValue(value)}</span>
			</div>
			{isExpanded && (
				<div className="property-json">
					<pre>{JSON.stringify(value, null, 2)}</pre>
				</div>
			)}
		</div>
	)
}

// [3]
function BindingRow({
	binding,
	selectedShapeId,
}: {
	binding: TLBinding
	selectedShapeId: TLShapeId
}) {
	const editor = useEditor()
	const isFrom = binding.fromId === selectedShapeId
	const otherShapeId = isFrom ? binding.toId : binding.fromId
	const otherShape = useValue('other shape', () => editor.getShape(otherShapeId), [
		editor,
		otherShapeId,
	])

	return (
		<div className="binding-row">
			<div className="binding-header">
				<span className="binding-type">{binding.type}</span>
				<span className="binding-direction">({isFrom ? 'from' : 'to'})</span>
			</div>
			<PropertyRow name="id" value={binding.id} />
			<PropertyRow name={isFrom ? 'toId' : 'fromId'} value={otherShapeId} />
			{otherShape && <PropertyRow name="shape" value={otherShape.type} />}
			{Object.keys(binding.props).length > 0 && <PropertyRow name="props" value={binding.props} />}
		</div>
	)
}

// [4]
function InspectorPanelWrapper() {
	const colorMode = useColorMode()
	return (
		<div className={colorMode === 'dark' ? 'tl-theme__dark' : 'tl-theme__light'}>
			<InspectorPanel />
		</div>
	)
}

// [5]
export default function InspectorPanelExample() {
	const [editor, setEditor] = useState<Editor | null>(null)

	return (
		<div className="example-container">
			<div className="canvas-container">
				<Tldraw persistenceKey="inspector-panel-example" onMount={setEditor} />
			</div>
			{editor && (
				<EditorProvider editor={editor}>
					<InspectorPanelWrapper />
				</EditorProvider>
			)}
		</div>
	)
}

/*
[1]
Everything the panel shows is read inside `useValue`, so the panel re-renders whenever
the selection or the selected shapes' records change. `getSharedStyles()` and
`getBindingsInvolvingShape()` are the same APIs the style panel and arrow bindings use.

[2]
`getSharedStyles()` returns a map from `StyleProp` to a `SharedStyle`: either
`{ type: 'shared', value }` when every selected shape agrees, or `{ type: 'mixed' }`.

[3]
Bindings are directional records with `fromId` and `toId`. For an arrow bound to a
shape, the arrow is `from` and the shape is `to`.

[4]
Components rendered outside `<Tldraw>` don't inherit its theme class, so we apply
`tl-theme__dark` / `tl-theme__light` ourselves based on `useColorMode()`.

[5]
The panel lives outside `<Tldraw>`, so it can't call `useEditor()` on its own. We grab
the editor from `onMount` and wrap the panel in `EditorProvider` to make the editor
hooks work there.
*/
