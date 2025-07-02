import { useState } from 'react'
import { Editor, EditorProvider, Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './inspector-panel.css'

// Inspector Panel Component that shows selected shape properties
function InspectorPanel() {
	const editor = useEditor()

	// Get the currently selected shapes, updates reactively
	const selectedShapes = useValue('selected shapes', () => editor.getSelectedShapes(), [editor])

	// Only show inspector when exactly one shape is selected
	const selectedShape = selectedShapes.length === 1 ? selectedShapes[0] : null

	// Get bindings involving the selected shape
	const bindings = useValue(
		'bindings',
		() => {
			if (!selectedShape) return []
			return editor.getBindingsInvolvingShape(selectedShape.id)
		},
		[editor, selectedShape]
	)

	if (!selectedShape) {
		return (
			<div className="inspector-panel">
				<h3>Inspector</h3>
				<p>{selectedShapes.length === 0 ? 'No shape selected' : 'Multiple shapes selected'}</p>
			</div>
		)
	}

	return (
		<div className="inspector-panel">
			<h3>Inspector</h3>
			<div className="inspector-section">
				<h4>Basic Properties</h4>
				{Object.entries(selectedShape).map(([key, value]) => {
					if (key === 'props') return null // Skip props, we'll show them separately
					return <PropertyRow key={key} name={key} value={value} />
				})}
			</div>

			{selectedShape.props && Object.keys(selectedShape.props).length > 0 && (
				<div className="inspector-section">
					<h4>Shape Props</h4>
					{Object.entries(selectedShape.props).map(([key, value]) => (
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

// Component to render an individual property row
function PropertyRow({ name, value }: { name: string; value: any }) {
	const formatValue = (val: any): string => {
		if (val === null || val === undefined) return String(val)
		if (typeof val === 'string') return `"${val}"`
		if (typeof val === 'object') {
			if (Array.isArray(val)) return `Array(${val.length})`
			// Handle rich text objects
			if ('richText' in val && val.richText) {
				return `"${val.richText[0]?.children?.[0]?.text || ''}"`
			}
			return `Object`
		}
		return String(val)
	}

	return (
		<div className="property-row">
			<span className="property-name">{name}:</span>
			<span className="property-value">{formatValue(value)}</span>
		</div>
	)
}

// Component to render a binding row
function BindingRow({ binding, selectedShapeId }: { binding: any; selectedShapeId: string }) {
	const editor = useEditor()

	// Determine the relationship
	const isFrom = binding.fromId === selectedShapeId
	const otherShapeId = isFrom ? binding.toId : binding.fromId
	const relationship = isFrom ? 'from' : 'to'

	// Get info about the other shape
	const otherShape = useValue(
		'other shape',
		() => {
			return editor.getShape(otherShapeId)
		},
		[editor, otherShapeId]
	)

	return (
		<div className="binding-row">
			<div className="binding-header">
				<span className="binding-type">{binding.type}</span>
				<span className="binding-direction">({relationship})</span>
			</div>
			<div className="property-row">
				<span className="property-name">id:</span>
				<span className="property-value">&quot;{binding.id}&quot;</span>
			</div>
			<div className="property-row">
				<span className="property-name">{relationship === 'from' ? 'toId' : 'fromId'}:</span>
				<span className="property-value">&quot;{otherShapeId}&quot;</span>
			</div>
			{otherShape && (
				<div className="property-row">
					<span className="property-name">shape:</span>
					<span className="property-value">{otherShape.type}</span>
				</div>
			)}
			{binding.props && Object.keys(binding.props).length > 0 && (
				<div className="binding-props">
					<div className="property-name">props:</div>
					{Object.entries(binding.props).map(([key, value]) => (
						<div key={key} className="property-row binding-prop">
							<span className="property-name"> {key}:</span>
							<span className="property-value">{JSON.stringify(value)}</span>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

export default function InspectorPanelExample() {
	const [editor, setEditor] = useState<Editor | null>(null)

	return (
		<div className="example-container">
			<div className="canvas-container">
				<Tldraw persistenceKey="inspector-panel-example" onMount={setEditor} />
			</div>
			{editor && (
				<EditorProvider editor={editor}>
					<InspectorPanel />
				</EditorProvider>
			)}
		</div>
	)
}
