import { useState } from 'react'
import {
	BaseBoxShapeUtil,
	HTMLContainer,
	RecordProps,
	T,
	TLComponents,
	Tldraw,
	TldrawUiButton,
	TLShape,
	TLUiOverrides,
	useA11y,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './screen-reader-accessibility.css'

const CARD_SHAPE_TYPE = 'note-card'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[CARD_SHAPE_TYPE]: { w: number; h: number; title: string; description: string }
	}
}

type CardShape = TLShape<typeof CARD_SHAPE_TYPE>

export class CardShapeUtil extends BaseBoxShapeUtil<CardShape> {
	static override type = CARD_SHAPE_TYPE
	static override props: RecordProps<CardShape> = {
		w: T.number,
		h: T.number,
		title: T.string,
		description: T.string,
	}

	getDefaultProps(): CardShape['props'] {
		return {
			w: 300,
			h: 180,
			title: 'Untitled',
			description: '',
		}
	}

	// [1]
	override getAriaDescriptor(shape: CardShape): string | undefined {
		const { title, description } = shape.props
		if (description) {
			return `${title} - ${description}`
		}
		return title
	}

	// [2]
	override getText(shape: CardShape): string | undefined {
		return `${shape.props.title}\n${shape.props.description}`
	}

	component(shape: CardShape) {
		const { title, description } = shape.props

		return (
			<HTMLContainer className="card-shape">
				<div className="card-shape-title">{title}</div>
				{description && <div className="card-shape-description">{description}</div>}
			</HTMLContainer>
		)
	}

	getIndicatorPath(shape: CardShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

const customShapes = [CardShapeUtil]

// [3]
const overrides: TLUiOverrides = {
	translations: {
		en: { [`tool.${CARD_SHAPE_TYPE}`]: 'Note card' },
	},
}

function CustomAnnouncementPanel() {
	const editor = useEditor()
	// [4]
	const a11y = useA11y()
	const [isEnabled, setIsEnabled] = useState(false)

	// [5]
	const handleActionConfirmation = () => {
		const selectedShapes = editor.getSelectedShapes()
		if (selectedShapes.length > 0) {
			a11y.announce({
				msg: `Action completed for ${selectedShapes.length} shape${selectedShapes.length === 1 ? '' : 's'}`,
				priority: 'polite',
			})
		} else {
			a11y.announce({
				msg: 'No shapes selected',
				priority: 'polite',
			})
		}
	}

	// [6]
	const handleValidation = () => {
		const selectedShapes = editor.getSelectedShapes()
		if (selectedShapes.length === 0) {
			a11y.announce({
				msg: 'Validation failed: No shapes selected',
				priority: 'assertive',
			})
		} else {
			const hasText = selectedShapes.some((shape) => {
				const util = editor.getShapeUtil(shape)
				return util.getText(shape)
			})
			if (!hasText) {
				a11y.announce({
					msg: 'Validation failed: Selected shapes must contain text',
					priority: 'assertive',
				})
			} else {
				a11y.announce({
					msg: 'Validation passed',
					priority: 'polite',
				})
			}
		}
	}

	// [7]
	const handleToggle = () => {
		const newState = !isEnabled
		setIsEnabled(newState)
		a11y.announce({
			msg: `Feature ${newState ? 'enabled' : 'disabled'}`,
			priority: 'polite',
		})
	}

	return (
		<div className="tlui-menu announcement-panel">
			<TldrawUiButton type="normal" onClick={handleActionConfirmation}>
				Perform action
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={handleValidation}>
				Validate selection
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={handleToggle}>
				{isEnabled ? 'Disable' : 'Enable'} feature
			</TldrawUiButton>
		</div>
	)
}

const components: TLComponents = {
	TopPanel: CustomAnnouncementPanel,
}

export default function ScreenReaderAccessibilityExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapes}
				overrides={overrides}
				components={components}
				onMount={(editor) => {
					// [8]
					editor.createShape({
						type: CARD_SHAPE_TYPE,
						x: 100,
						y: 100,
						props: {
							title: 'Meeting Notes',
							description: 'Discussed Q4 planning and team goals',
						},
					})

					editor.createShape({
						type: CARD_SHAPE_TYPE,
						x: 450,
						y: 100,
						props: {
							title: 'Project Ideas',
							description: 'Brainstorming session for new features',
						},
					})

					editor.createShape({
						type: CARD_SHAPE_TYPE,
						x: 100,
						y: 320,
						props: {
							title: 'Action Items',
							description: 'Follow up with design team by Friday',
						},
					})
				}}
			/>
		</div>
	)
}

/*
This example shows two sides of screen reader support: making a custom shape
describe itself when selected, and announcing your own messages from custom UI.

[1]
`getAriaDescriptor()` returns the text announced when the shape is selected.
It's the place for an alt-text-style description that may differ from what's
visibly rendered. If it returns nothing, the announcer falls back to
`getText()`.

[2]
`getText()` returns the shape's visible text. The editor uses it for text
extraction and search, and the announcer uses it as the fallback described in
[1]. Returning it here also lets the "Validate selection" button below check
whether the selected shapes have any text at all.

[3]
The selection announcement ends with the shape's type, looked up as
`tool.<type>` in the UI translations. Without an override a custom shape is
announced by its raw key ("tool.note-card"), so we add a translation for it.

[4]
`useA11y()` returns the accessibility context. It must be called from a
component rendered inside `<Tldraw />`, such as this `TopPanel` component.

[5]
Polite announcements queue behind whatever the screen reader is currently
saying. Use them for confirmations and status updates.

[6]
Assertive announcements interrupt the current speech. Reserve them for
messages the user must hear now, like validation errors.

[7]
Announce state changes when the visible change alone (here, the button label
flipping) wouldn't be noticed by a screen reader user.

[8]
Create three sample cards. Select one to hear the `getAriaDescriptor()`
text, followed by the shape type and its index in reading order ("1 of 3").
The announcements render into an off-screen ARIA live region owned by the
default `A11y` component, so nothing visible changes.
*/
