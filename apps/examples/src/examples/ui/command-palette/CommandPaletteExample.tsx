import {
	CommandPaletteActionGroup,
	DefaultCommandPalette,
	DefaultColorStyle,
	DefaultCommandPaletteContent,
	TLComponents,
	TLUiOverrides,
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
const overrides: TLUiOverrides = {
	actions(editor, actions) {
		actions['make-red'] = {
			id: 'make-red',
			label: 'Make red',
			isEnabled: (editor) => editor.getSelectedShapeIds().length > 0,
			disabledReason: 'command-palette.reason.select-shape',
			commandPalette: { group: 'colors' },
			onSelect() {
				editor.setStyleForSelectedShapes(DefaultColorStyle, 'red')
			},
		}
		return actions
	},
}

// [3]
function CustomCommandPalette() {
	const { addToast } = useToasts()
	return (
		<DefaultCommandPalette>
			<CommandPaletteActionGroup group="colors" label="Colors" />
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
				overrides={overrides}
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
Actions are listed in the palette on their own, gated by `isEnabled` like everywhere else. While
nothing is selected, searching "make red" shows the row greyed out with its `disabledReason`.
`commandPalette.group` lists it in a `CommandPaletteActionGroup` with that group; without one it
would land in the catch-all at the end of the default content.

[3]
Wrap `DefaultCommandPalette` and keep `DefaultCommandPaletteContent` to add commands without
rebuilding the palette. Items are the same `TldrawUiMenu*` components the other menus use.
*/
