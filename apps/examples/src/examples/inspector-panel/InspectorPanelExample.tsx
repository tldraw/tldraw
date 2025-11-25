import { useState } from 'react'
import { Editor, EditorProvider, Tldraw, useEditor, useIsDarkMode, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './inspector-panel.css'

// Inspector Panel Component that shows selected shape properties
function InspectorPanel() {
	const editor = useEditor()

	// Get the currently selected shapes, updates reactively
	const selectedShapes = useValue('selected shapes', () => editor.getSelectedShapes(), [editor])

	// Get shared styles when multiple shapes are selected
	const sharedStyles = useValue(
		'shared styles',
		() => {
			if (selectedShapes.length <= 1) return null
			return editor.getSharedStyles()
		},
		[editor, selectedShapes]
	)

	// Get bindings involving the selected shape (only for single selection)
	const bindings = useValue(
		'bindings',
		() => {
			if (selectedShapes.length !== 1) return []
			return editor.getBindingsInvolvingShape(selectedShapes[0].id)
		},
		[editor, selectedShapes]
	)

	const isDarkMode = useIsDarkMode()

	const selectedShape = selectedShapes.length === 1 ? selectedShapes[0] : null

	if (selectedShapes.length === 0) {
		return (
			<div
				className={`${isDarkMode ? 'inspector-panel inspector-panel-dark' : ''} inspector-panel`}
			>
				<h3>Inspector</h3>
				<p>No shape selected</p>
			</div>
		)
	}

	if (selectedShapes.length > 1) {
		return (
			<div
				className={`${isDarkMode ? 'inspector-panel inspector-panel-dark' : ''} inspector-panel`}
			>
				<h3>Inspector</h3>
				{sharedStyles && sharedStyles.size > 0 && (
					<div className="inspector-section">
						<h4>Shared Styles</h4>
						{Array.from(sharedStyles.entries()).map(([styleProp, sharedStyle]) => (
							<SharedStyleRow key={styleProp.id} styleProp={styleProp} sharedStyle={sharedStyle} />
						))}
					</div>
				)}
				<p>{selectedShapes.length} shapes selected</p>
			</div>
		)
	}

	// Single shape selected
	return (
		<div className={`${isDarkMode ? 'inspector-panel inspector-panel-dark' : ''} inspector-panel`}>
			<h3>Inspector</h3>
			<div className="inspector-section">
				{Object.entries(selectedShape!).map(([key, value]) => {
					if (key === 'props') return null // Skip props, we'll show them separately
					return <PropertyRow key={key} name={key} value={value} path={`basic.${key}`} />
				})}
			</div>

			{selectedShape!.props && Object.keys(selectedShape!.props).length > 0 && (
				<div className="inspector-section">
					<h4>Shape Props</h4>
					{Object.entries(selectedShape!.props).map(([key, value]) => (
						<PropertyRow key={key} name={key} value={value} path={`props.${key}`} />
					))}
				</div>
			)}

			{bindings.length > 0 && (
				<div className="inspector-section">
					<h4>Bindings ({bindings.length})</h4>
					{bindings.map((binding) => (
						<BindingRow key={binding.id} binding={binding} selectedShapeId={selectedShape!.id} />
					))}
				</div>
			)}
		</div>
	)
}

// Component to render a shared style row
function SharedStyleRow({ styleProp, sharedStyle }: { styleProp: any; sharedStyle: any }) {
	const formatStyleValue = (style: any): string => {
		if (style.type === 'mixed') {
			return '(mixed)'
		} else if (style.type === 'shared') {
			return typeof style.value === 'string' ? `"${style.value}"` : String(style.value)
		}
		return String(style)
	}

	const getStyleClass = (style: any): string => {
		return style.type === 'mixed' ? 'mixed-style' : 'shared-style'
	}

	return (
		<div className="property-row">
			<span className="property-name">{styleProp.id.replace('tldraw:', '')}:</span>
			<span className={`property-value ${getStyleClass(sharedStyle)}`}>
				{formatStyleValue(sharedStyle)}
			</span>
		</div>
	)
}

// Component to render an individual property row
function PropertyRow({ name, value, path: _path }: { name: string; value: any; path: string }) {
	const [isExpanded, setIsExpanded] = useState(false)

	const isObject = value !== null && value !== undefined && typeof value === 'object'

	const formatValue = (val: any): string => {
		if (val === null || val === undefined) return String(val)
		if (typeof val === 'string') return `"${val}"`
		if (typeof val === 'object') {
			if (Array.isArray(val)) return `Array(${val.length})`
			// Handle rich text objects
			if ('richText' in val && val.richText) {
				return `"${val.richText[0]?.children?.[0]?.text || ''}"`
			}
			return `Object(${Object.keys(val).length} keys)`
		}
		return String(val)
	}

	const formatJsonValue = (val: any): string => {
		try {
			return JSON.stringify(val, null, 2)
		} catch (_e) {
			return String(val)
		}
	}

	if (isObject) {
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
						<pre>{formatJsonValue(value)}</pre>
					</div>
				)}
			</div>
		)
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
			<PropertyRow name="id" value={binding.id} path={`binding.${binding.id}.id`} />
			<PropertyRow
				name={relationship === 'from' ? 'toId' : 'fromId'}
				value={otherShapeId}
				path={`binding.${binding.id}.otherId`}
			/>
			{otherShape && (
				<PropertyRow
					name="shape"
					value={otherShape.type}
					path={`binding.${binding.id}.shapeType`}
				/>
			)}
			{binding.props && Object.keys(binding.props).length > 0 && (
				<PropertyRow name="props" value={binding.props} path={`binding.${binding.id}.props`} />
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
