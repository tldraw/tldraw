import {
	DefaultStylePanel,
	DefaultStylePanelContent,
	Editor,
	TLGeoShape,
	TLShape,
	TLShapeStyleOverrides,
	Tldraw,
	track,
	useEditor,
	useRelevantStyles,
} from 'tldraw'
import 'tldraw/tldraw.css'

// [1] Define the custom $ prop types
type BrandTheme = 'none' | 'primary' | 'secondary' | 'accent'

// [2] Augment the shape props type to include our custom $ props
// This gives us type safety when creating or updating shapes
declare module 'tldraw' {
	interface TLGeoShapeProps {
		$warning?: boolean
		$brandTheme?: BrandTheme
	}
}

// [3] Define the style resolver for our custom $ props
// This function reads the $ props from a shape and returns style overrides
function getCustomStyleOverrides(shape: TLShape, editor: Editor): TLShapeStyleOverrides | null {
	const props = shape.props as Record<string, unknown>
	const isDarkMode = editor.user.getIsDarkMode()

	const overrides: Record<string, unknown> = {}

	// Handle $brandTheme (priority 40 - applied first)
	if (shape.type === 'geo') {
		const brandTheme = props.$brandTheme as BrandTheme | undefined
		if (brandTheme && brandTheme !== 'none') {
			const themes = {
				primary: {
					strokeColor: isDarkMode ? '#74c0fc' : '#1c7ed6',
					fillColor: isDarkMode ? '#1864ab' : '#d0ebff',
				},
				secondary: {
					strokeColor: isDarkMode ? '#b197fc' : '#7048e8',
					fillColor: isDarkMode ? '#5f3dc4' : '#e5dbff',
				},
				accent: {
					strokeColor: isDarkMode ? '#63e6be' : '#0ca678',
					fillColor: isDarkMode ? '#087f5b' : '#c3fae8',
				},
			}
			Object.assign(overrides, themes[brandTheme])
		}
	}

	// Handle $warning (priority 50 - applied last, wins conflicts)
	if (props.$warning === true) {
		overrides.strokeColor = isDarkMode ? '#ff6b6b' : '#e03131'
		overrides.labelColor = isDarkMode ? '#ff6b6b' : '#e03131'
	}

	return Object.keys(overrides).length > 0 ? (overrides as TLShapeStyleOverrides) : null
}

// [4] Custom style panel that includes controls for our $ props
const CustomStylePanel = track(function CustomStylePanel() {
	const editor = useEditor()
	const styles = useRelevantStyles()

	// Get the current values from selected shapes
	const selectedShapes = editor.getSelectedShapes()
	const geoShapes = selectedShapes.filter((s) => s.type === 'geo') as TLGeoShape[]

	// Check if any selected shapes support our custom props
	const hasGeoShapes = geoShapes.length > 0
	const hasAnyShapes = selectedShapes.length > 0

	// Get current warning value
	const warningValues = selectedShapes.map((s) => (s.props as any).$warning ?? false)
	const warningValue =
		warningValues.length > 0 && warningValues.every((v) => v === warningValues[0])
			? warningValues[0]
			: undefined

	// Get current brand theme value (only geo shapes)
	const brandThemeValues = geoShapes.map((s) => s.props.$brandTheme ?? 'none')
	const brandThemeValue =
		brandThemeValues.length > 0 && brandThemeValues.every((v) => v === brandThemeValues[0])
			? brandThemeValues[0]
			: undefined

	if (!styles) return null

	return (
		<DefaultStylePanel>
			<DefaultStylePanelContent />
			{/* Warning toggle */}
			{hasAnyShapes && (
				<div style={{ padding: '8px' }}>
					<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						<input
							type="checkbox"
							checked={warningValue === true}
							onChange={(e) => {
								editor.markHistoryStoppingPoint()
								for (const shape of selectedShapes) {
									editor.updateShape({
										id: shape.id,
										type: shape.type,
										props: { $warning: e.target.checked },
									} as any)
								}
							}}
						/>
						Warning Mode
						{warningValue === undefined && <span style={{ opacity: 0.5 }}>(mixed)</span>}
					</label>
				</div>
			)}
			{/* Brand theme selector - only shown for geo shapes */}
			{hasGeoShapes && (
				<div style={{ padding: '8px' }}>
					<label style={{ display: 'block', marginBottom: 4 }}>Brand Theme</label>
					<select
						style={{ width: '100%', padding: 4 }}
						value={brandThemeValue ?? ''}
						onChange={(e) => {
							const newValue = e.currentTarget.value as BrandTheme
							editor.markHistoryStoppingPoint()
							for (const shape of geoShapes) {
								editor.updateShape({
									id: shape.id,
									type: shape.type,
									props: { $brandTheme: newValue },
								})
							}
						}}
					>
						{brandThemeValue === undefined && <option value="">Mixed</option>}
						<option value="none">None</option>
						<option value="primary">Primary</option>
						<option value="secondary">Secondary</option>
						<option value="accent">Accent</option>
					</select>
				</div>
			)}
		</DefaultStylePanel>
	)
})

export default function CustomStyleResolverExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// Use a unique persistence key to avoid conflicts with old data
				persistenceKey="custom-style-resolver-example-v2"
				// [5] Use getShapeStyleOverrides to resolve $ props to actual styles
				getShapeStyleOverrides={getCustomStyleOverrides}
				components={{
					StylePanel: CustomStylePanel,
				}}
				onMount={(editor) => {
					// Clear any existing shapes and create fresh ones
					editor.selectAll()
					editor.deleteShapes(editor.getSelectedShapeIds())
					// Create some example shapes
					editor.createShape<TLGeoShape>({
						type: 'geo',
						x: 100,
						y: 100,
						props: {
							geo: 'rectangle',
							w: 150,
							h: 100,
							$brandTheme: 'primary',
						},
					})

					editor.createShape<TLGeoShape>({
						type: 'geo',
						x: 300,
						y: 100,
						props: {
							geo: 'ellipse',
							w: 150,
							h: 100,
							$warning: true,
						},
					})

					editor.createShape<TLGeoShape>({
						type: 'geo',
						x: 500,
						y: 100,
						props: {
							geo: 'diamond',
							w: 150,
							h: 100,
							$brandTheme: 'accent',
							$warning: true, // Warning overrides because it's applied last
						},
					})

					editor.selectAll()
				}}
			/>
		</div>
	)
}

/*
This example demonstrates custom $ props that resolve to style overrides.

[1] We define custom $ prop types. The $ prefix indicates these are custom
    style-related props that should be allowed in shape.props.

[2] We augment TLGeoShapeProps to include our custom $ props.
    This gives us type safety when creating or updating shapes.

[3] We define a resolver function that reads $ props from shapes and returns
    style overrides. This function is passed to getShapeStyleOverrides.
    - $brandTheme changes the color scheme (only for geo shapes)
    - $warning makes shapes appear in warning colors (for any shape)
    - When both are set, $warning wins because it's applied last

[4] We create a custom style panel with controls for our $ props.
    Since $ props aren't part of the built-in style system, we read/write
    them directly on shape.props.

[5] We pass our resolver to getShapeStyleOverrides. This is called by the
    Editor when computing styles for each shape.

Key points:
- $ props are stored in shape.props and pass through validation
- Use getShapeStyleOverrides to resolve $ props to actual styles
- Later overrides win when there are conflicts
- Augment shape prop types for type safety
*/
