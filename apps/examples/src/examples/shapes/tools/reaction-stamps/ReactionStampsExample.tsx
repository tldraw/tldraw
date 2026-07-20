import {
	ArrowDownToolbarItem,
	ArrowLeftToolbarItem,
	ArrowRightToolbarItem,
	ArrowToolbarItem,
	ArrowUpToolbarItem,
	AssetToolbarItem,
	CheckBoxToolbarItem,
	CloudToolbarItem,
	DefaultStylePanel,
	DefaultStylePanelContent,
	DefaultToolbar,
	DiamondToolbarItem,
	DrawToolbarItem,
	EllipseToolbarItem,
	EraserToolbarItem,
	FrameToolbarItem,
	HandToolbarItem,
	HeartToolbarItem,
	HexagonToolbarItem,
	HighlightToolbarItem,
	LaserToolbarItem,
	LineToolbarItem,
	NoteToolbarItem,
	OvalToolbarItem,
	RectangleToolbarItem,
	RhombusToolbarItem,
	SelectToolbarItem,
	StarToolbarItem,
	TLComponents,
	TLUiOverrides,
	TextToolbarItem,
	Tldraw,
	TldrawUiButton,
	ToolbarItem,
	TriangleToolbarItem,
	XBoxToolbarItem,
	useEditor,
	useRelevantStyles,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { ReactionBindingUtil } from './ReactionBindingUtil'
import { ReactionEmojiStyle, ReactionShapeUtil } from './ReactionShapeUtil'
import { ReactionTool } from './ReactionTool'
import './reaction-stamps.css'

// There's a guide at the bottom of this file!

// [1]
const overrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.reaction = {
			id: 'reaction',
			icon: 'reaction-smiley',
			label: 'Reaction',
			kbd: 'x',
			onSelect: () => editor.setCurrentTool('reaction'),
		}
		return tools
	},
}

const assetUrls = {
	icons: {
		'reaction-smiley': '/reaction-smiley.svg',
	},
}

// [2]
function ToolbarWithReactions() {
	return (
		<DefaultToolbar>
			<SelectToolbarItem />
			<HandToolbarItem />
			<DrawToolbarItem />
			<EraserToolbarItem />
			<ArrowToolbarItem />
			<TextToolbarItem />
			<NoteToolbarItem />
			<ToolbarItem tool="reaction" />
			<AssetToolbarItem />
			<RectangleToolbarItem />
			<EllipseToolbarItem />
			<TriangleToolbarItem />
			<DiamondToolbarItem />
			<HexagonToolbarItem />
			<OvalToolbarItem />
			<RhombusToolbarItem />
			<StarToolbarItem />
			<CloudToolbarItem />
			<HeartToolbarItem />
			<XBoxToolbarItem />
			<CheckBoxToolbarItem />
			<ArrowLeftToolbarItem />
			<ArrowUpToolbarItem />
			<ArrowDownToolbarItem />
			<ArrowRightToolbarItem />
			<LineToolbarItem />
			<HighlightToolbarItem />
			<LaserToolbarItem />
			<FrameToolbarItem />
		</DefaultToolbar>
	)
}

// [3]
function StylePanelWithEmojis() {
	const editor = useEditor()
	const styles = useRelevantStyles()
	if (!styles) return null

	const emoji = styles.get(ReactionEmojiStyle)

	return (
		<DefaultStylePanel>
			{emoji !== undefined && (
				<div className="reaction-emoji-row">
					{ReactionEmojiStyle.values.map((value) => (
						<TldrawUiButton
							key={value}
							type="icon"
							data-active={emoji.type === 'shared' && emoji.value === value}
							title={value}
							onClick={() => {
								editor.run(() => {
									editor.markHistoryStoppingPoint()
									editor.setStyleForSelectedShapes(ReactionEmojiStyle, value)
									editor.setStyleForNextShapes(ReactionEmojiStyle, value)
								})
							}}
						>
							{value}
						</TldrawUiButton>
					))}
				</div>
			)}
			<DefaultStylePanelContent />
		</DefaultStylePanel>
	)
}

const components: TLComponents = {
	Toolbar: ToolbarWithReactions,
	StylePanel: StylePanelWithEmojis,
}

export default function ReactionStampsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={[ReactionShapeUtil]}
				bindingUtils={[ReactionBindingUtil]}
				tools={[ReactionTool]}
				overrides={overrides}
				assetUrls={assetUrls}
				components={components}
				onMount={(editor) => {
					// [4]
					const previousGetInitialMetaForShape = editor.getInitialMetaForShape
					editor.getInitialMetaForShape = (shape) => {
						if (shape.type !== 'reaction') return previousGetInitialMetaForShape(shape)
						return {
							createdBy: editor.user.getExternalId(),
							createdAt: Date.now(),
						}
					}
				}}
			/>
		</div>
	)
}

/*
Introduction:

This example adds an emoji reaction stamp: a custom shape placed with a stamp tool, with
the emoji chosen from the style panel just like a color or fill.

[1]
Register the reaction tool in the UI so the toolbar knows its icon, label, and shortcut.
The smiley icon is a custom SVG (public/reaction-smiley.svg) drawn in the same 30x30
outline style as tldraw's built-in icons, registered via the `assetUrls` prop. Icons are
rendered through a CSS mask, so the stroke color adapts to the theme automatically.

[2]
Recompose the default toolbar so the reaction tool sits next to the sticky note tool.
Every item here is one of tldraw's exported toolbar items; only the `reaction` entry
is new.

[3]
The emoji is a StyleProp (see ReactionShapeUtil.tsx), so `useRelevantStyles` reports it
whenever the reaction tool is active or a reaction shape is selected — the same mechanism
that shows geo styles when the rectangle tool is active. We add a row of emoji buttons to
the default style panel. Setting the style applies it to selected reactions and remembers
it for the next stamp.

[4]
Attribution: `getInitialMetaForShape` stamps who placed each reaction and when into the
shape's meta. Hover a stamp to see it. In a real app the id would come from your auth
system, and names would be resolved from ids at render time.

[5]
Binding: stamping on a shape creates a `reaction` binding (see ReactionBindingUtil.ts)
that stores where on the shape the stamp sits, as percentages of the shape's bounds.
When the shape moves, resizes, or rotates, the binding rewrites the reaction's position
so it rides along. Deleting the shape deletes its reactions. Drag a reaction to detach
it; drop it on another shape to re-attach.
*/
