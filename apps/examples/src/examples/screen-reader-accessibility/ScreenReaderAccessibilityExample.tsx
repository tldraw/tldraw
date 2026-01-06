import { useState } from 'react'
import {
	BaseBoxShapeUtil,
	HTMLContainer,
	RecordProps,
	T,
	Tldraw,
	TldrawUiButton,
	TLShape,
	useA11y,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './screen-reader-accessibility.css'

const CARD_SHAPE_TYPE = 'note-card'

// [1]
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[CARD_SHAPE_TYPE]: { w: number; h: number; title: string; description: string }
	}
}

type CardShape = TLShape<typeof CARD_SHAPE_TYPE>

// [2]
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

	// [2]
	override getAriaDescriptor(shape: CardShape): string | undefined {
		const { title, description } = shape.props
		if (description) {
			return `${title} - ${description}`
		}
		return title
	}

	// [3]
	override getText(shape: CardShape): string | undefined {
		return `${shape.props.title}\n${shape.props.description}`
	}

	component(shape: CardShape) {
		const { title, description } = shape.props

		return (
			<HTMLContainer
				style={{
					padding: '16px',
					backgroundColor: '#ffffff',
					border: '1px solid #e0e0e0',
					borderRadius: '8px',
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
					display: 'flex',
					flexDirection: 'column',
					gap: '8px',
				}}
			>
				<div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a' }}>{title}</div>
				{description && (
					<div style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>{description}</div>
				)}
			</HTMLContainer>
		)
	}

	// [5]
	indicator(shape: CardShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

// [6]
const customShapes = [CardShapeUtil]

// [7]
function CustomAnnouncementPanel() {
	const editor = useEditor()
	// [1]
	const a11y = useA11y()
	const [isEnabled, setIsEnabled] = useState(false)

	// [4]
	const handleActionConfirmation = () => {
		const selectedShapes = editor.getSelectedShapes()
		if (selectedShapes.length > 0) {
			// Simulate an action being performed
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

	// [5]
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

	// [6]
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

export default function ScreenReaderAccessibilityExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapes}
				components={{
					// [12]
					TopPanel: CustomAnnouncementPanel,
				}}
				onMount={(editor) => {
					// [7]
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

Introduction:

This example demonstrates how to create accessible custom shapes and custom screen reader announcements in tldraw.

[1]
The useA11y() hook provides access to the accessibility manager. It must be called
within a component that's rendered inside the Tldraw component.

[2]
The getAriaDescriptor() method provides accessibility-specific descriptions for screen readers.
When a shape is selected, this description is announced to screen reader users. 
This is different from getText() - getAriaDescriptor() is specifically
for accessibility announcements, not for text extraction or search.

[3]
The getText() method returns the visible text content of the shape. This is used for text
extraction, search functionality, and as a fallback for accessibility if getAriaDescriptor()
is not provided. It returns the title and description separated by a newline.

[4]
Polite announcements are used for informational messages that don't require immediate
attention. They wait for the screen reader to finish its current announcement before
speaking. This is appropriate for action confirmations and status updates.

[5]
Assertive announcements are used for critical messages that need immediate attention,
such as validation errors. They interrupt the current screen reader output to ensure
the user hears the message right away.

[6]
State change announcements help keep users informed about the current state of the
application. Use polite priority for state changes unless they're critical.

[7]
Create three sample cards with different titles and descriptions. Try selecting different cards
to hear how screen readers announce them using the getAriaDescriptor() method. The announcement
will include the card's custom description followed by the shape type and position information.
You can also use the buttons in the top panel to trigger custom announcements that demonstrate
polite and assertive priority levels.
*/
