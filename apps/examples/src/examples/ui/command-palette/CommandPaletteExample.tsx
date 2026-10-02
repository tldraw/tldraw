import {
	DefaultCommandPalette,
	DefaultCommandPaletteContent,
	TLComponents,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	getCommandPaletteMatchScore,
	toRichText,
	useCommandPaletteQuery,
	useEditor,
	useToasts,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
function ShapeSearchGroup() {
	const editor = useEditor()
	const query = useCommandPaletteQuery()
	const matches = useValue(
		'shape matches',
		() => {
			if (!query.trim()) return []
			return editor
				.getCurrentPageShapes()
				.map((shape) => {
					const text = editor.getShapeUtil(shape).getText(shape) ?? ''
					return { shape, text, score: text ? getCommandPaletteMatchScore(query, text) : 0 }
				})
				.filter(({ score }) => score > 0)
				.sort((a, b) => b.score - a.score)
				.slice(0, 5)
		},
		[editor, query]
	)

	return (
		<TldrawUiMenuGroup id="shapes" label="Shapes">
			{matches.map(({ shape, text }) => (
				<TldrawUiMenuItem
					key={shape.id}
					id={`shape:${shape.id}`}
					label={text}
					onSelect={() => {
						editor.select(shape.id)
						editor.zoomToSelection({ animation: { duration: 200 } })
					}}
				/>
			))}
		</TldrawUiMenuGroup>
	)
}

// [2]
function CustomCommandPalette() {
	const { addToast } = useToasts()
	return (
		<DefaultCommandPalette>
			<TldrawUiMenuGroup id="example" label="Example">
				<TldrawUiMenuItem
					id="say-hello"
					label="Say hello"
					onSelect={() => {
						addToast({ title: 'Hello!' })
					}}
				/>
			</TldrawUiMenuGroup>
			<ShapeSearchGroup />
			<DefaultCommandPaletteContent />
		</DefaultCommandPalette>
	)
}

const components: TLComponents = {
	CommandPalette: CustomCommandPalette,
}

export default function CommandPaletteExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={components}
				onMount={(editor) => {
					editor.createShapes(
						['Ideas', 'Roadmap', 'Retro notes'].map((text, i) => ({
							type: 'note',
							x: i * 260,
							y: 0,
							props: { richText: toRichText(text) },
						}))
					)
				}}
			/>
		</div>
	)
}

/*
[1]
A group can filter itself. `useCommandPaletteQuery` returns what the user typed, and
`getCommandPaletteMatchScore` matches the same way the palette does, so only the best matches
are rendered instead of every shape on the page.

[2]
Wrap `DefaultCommandPalette` and keep `DefaultCommandPaletteContent` to add commands without
rebuilding the palette. Items are the same `TldrawUiMenu*` components the other menus use.
*/
