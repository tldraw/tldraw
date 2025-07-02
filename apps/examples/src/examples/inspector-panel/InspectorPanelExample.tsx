import { TLComponents, TLShape, Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'

// Inspector Panel Component that shows selected shape properties
function InspectorPanel() {
	const editor = useEditor()

	// Get the currently selected shapes, updates reactively
	const selectedShapes = useValue('selected shapes', () => editor.getSelectedShapes(), [editor])

	// Only show inspector when exactly one shape is selected
	const selectedShape = selectedShapes.length === 1 ? selectedShapes[0] : null

	if (!selectedShape) {
		return (
			<div className="inspector-panel">
				<div className="inspector-header">Inspector</div>
				<div className="inspector-content">
					<div className="inspector-empty">
						{selectedShapes.length === 0 ? 'No shape selected' : 'Multiple shapes selected'}
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="inspector-panel">
			<div className="inspector-header">Inspector</div>
			<div className="inspector-content">
				<PropertySection title="Basic Properties" shape={selectedShape} />
				<PropertySection title="Shape Props" shape={selectedShape} isProps />
			</div>
		</div>
	)
}

// Component to render a section of properties
function PropertySection({
	title,
	shape,
	isProps = false,
}: {
	title: string
	shape: TLShape
	isProps?: boolean
}) {
	const properties = isProps ? shape.props : shape

	// Don't show props section if there are no custom props
	if (isProps && (!properties || Object.keys(properties).length === 0)) {
		return null
	}

	return (
		<div className="property-section">
			<div className="property-section-title">{title}</div>
			<div className="property-list">
				{Object.entries(properties).map(([key, value]) => {
					// Skip the props property in basic section since we show it separately
					if (!isProps && key === 'props') return null

					return <PropertyRow key={key} name={key} value={value} />
				})}
			</div>
		</div>
	)
}

// Component to render an individual property row
function PropertyRow({ name, value }: { name: string; value: any }) {
	const formatValue = (val: any): string => {
		if (val === null) return 'null'
		if (val === undefined) return 'undefined'
		if (typeof val === 'string') return `"${val}"`
		if (typeof val === 'number') return val.toString()
		if (typeof val === 'boolean') return val.toString()
		if (Array.isArray(val)) return `Array(${val.length})`
		if (typeof val === 'object') {
			// Handle special objects
			if ('richText' in val && val.richText) {
				return `"${val.richText[0]?.children?.[0]?.text || ''}"`
			}
			return `Object(${Object.keys(val).length} keys)`
		}
		return String(val)
	}

	const getValueType = (val: any): string => {
		if (val === null) return 'null'
		if (Array.isArray(val)) return 'array'
		return typeof val
	}

	return (
		<div className="property-row">
			<div className="property-name">{name}</div>
			<div className="property-value">
				<span className={`property-type property-type-${getValueType(value)}`}>
					{formatValue(value)}
				</span>
			</div>
		</div>
	)
}

// Custom components that include our inspector panel
const components: TLComponents = {
	SharePanel: InspectorPanel,
}

export default function InspectorPanelExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="inspector-panel-example" components={components} />
			<style>{`
				.inspector-panel {
					position: fixed;
					top: 10px;
					right: 10px;
					width: 320px;
					max-height: 80vh;
					background: white;
					border: 1px solid #e1e5e9;
					border-radius: 8px;
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
					font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
					font-size: 12px;
					overflow: hidden;
					z-index: 1000;
				}

				.inspector-header {
					background: #f8f9fa;
					padding: 12px 16px;
					border-bottom: 1px solid #e1e5e9;
					font-weight: 600;
					font-size: 13px;
					color: #1a1a1a;
				}

				.inspector-content {
					max-height: calc(80vh - 45px);
					overflow-y: auto;
				}

				.inspector-empty {
					padding: 24px 16px;
					text-align: center;
					color: #666;
					font-style: italic;
				}

				.property-section {
					border-bottom: 1px solid #f1f3f4;
				}

				.property-section:last-child {
					border-bottom: none;
				}

				.property-section-title {
					background: #f8f9fa;
					padding: 8px 16px;
					font-weight: 600;
					font-size: 11px;
					text-transform: uppercase;
					letter-spacing: 0.5px;
					color: #5f6368;
					border-bottom: 1px solid #e8eaed;
				}

				.property-list {
					padding: 0;
				}

				.property-row {
					display: flex;
					padding: 8px 16px;
					border-bottom: 1px solid #f8f9fa;
					align-items: flex-start;
					gap: 12px;
				}

				.property-row:last-child {
					border-bottom: none;
				}

				.property-row:hover {
					background: #f8f9fa;
				}

				.property-name {
					flex: 0 0 100px;
					font-weight: 500;
					color: #1a1a1a;
					word-break: break-word;
				}

				.property-value {
					flex: 1;
					min-width: 0;
					word-break: break-all;
				}

				.property-type {
					font-family: ui-monospace, Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
					padding: 2px 6px;
					border-radius: 4px;
					font-size: 11px;
				}

				.property-type-string {
					background: #e8f5e8;
					color: #137713;
				}

				.property-type-number {
					background: #e3f2fd;
					color: #1565c0;
				}

				.property-type-boolean {
					background: #fff3e0;
					color: #ef6c00;
				}

				.property-type-object {
					background: #f3e5f5;
					color: #7b1fa2;
				}

				.property-type-array {
					background: #fce4ec;
					color: #c2185b;
				}

				.property-type-null,
				.property-type-undefined {
					background: #f5f5f5;
					color: #666;
				}

				/* Dark mode support */
				@media (prefers-color-scheme: dark) {
					.inspector-panel {
						background: #2d2d2d;
						border-color: #404040;
						color: #e0e0e0;
					}

					.inspector-header,
					.property-section-title {
						background: #1a1a1a;
						color: #e0e0e0;
						border-color: #404040;
					}

					.property-row:hover {
						background: #1a1a1a;
					}

					.property-row {
						border-color: #1a1a1a;
					}

					.property-section {
						border-color: #404040;
					}

					.property-name {
						color: #e0e0e0;
					}
				}
			`}</style>
		</div>
	)
}
