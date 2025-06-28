import { ArrowShapeUtil, TextShapeUtil, Tldraw, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

// Configure the arrow shape to disable text outline
const CustomArrowShapeUtil = ArrowShapeUtil.configure({
	showTextOutline: true,
})

// Configure the text shape to disable outline
const CustomTextShapeUtil = TextShapeUtil.configure({
	showTextOutline: true,
})

// Use the configured shape utilities
const customShapeUtils = [CustomArrowShapeUtil, CustomTextShapeUtil]

export default function CustomTextOutlineExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// Use our custom shape utilities that have text outlines disabled
				shapeUtils={customShapeUtils}
				// Use a persistence key to save the state
				persistenceKey="custom-text-outline-example"
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size > 0) return

					const message = toRichText('very good whiteboard')

					// Lots of overlapping text shapes. These would normally be differentiated a bit using the text outline!
					editor.createShapes([
						{
							type: 'text',
							x: 100,
							y: 100,
							props: { richText: message },
						},
						{
							type: 'text',
							x: 110,
							y: 110,
							props: { richText: message },
						},
						{
							type: 'text',
							x: 120,
							y: 120,
							props: { richText: message },
						},
						{
							type: 'arrow',
							x: 0,
							y: 0,
							props: {
								text: 'hello world',
								start: { x: 0, y: 0 },
								end: { x: 200, y: 200 },
							},
						},
					])
				}}
			/>
		</div>
	)
}
