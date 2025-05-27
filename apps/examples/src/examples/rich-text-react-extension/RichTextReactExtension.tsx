import {
	mergeAttributes,
	Node,
	NodeViewProps,
	NodeViewWrapper,
	ReactNodeViewRenderer,
} from '@tiptap/react'
import { createShapeId, tipTapDefaultExtensions, Tldraw, TLTextOptions } from 'tldraw'

function MyReactComponent(props: NodeViewProps) {
	const increase = () => {
		props.updateAttributes({
			count: props.node.attrs.count + 1,
		})
	}

	return (
		<NodeViewWrapper className="react-component">
			<button onClick={increase}>
				This react button has been clicked {props.node.attrs.count} times.
			</button>
		</NodeViewWrapper>
	)
}

const MyReactComponentExtension = Node.create({
	name: 'reactComponent',
	group: 'block',
	atom: true,
	addAttributes() {
		return {
			count: {
				default: 0,
			},
		}
	},
	parseHTML() {
		return [
			{
				tag: 'react-component',
			},
		]
	},

	renderHTML({ HTMLAttributes }) {
		return ['react-component', mergeAttributes(HTMLAttributes)]
	},

	addNodeView() {
		return ReactNodeViewRenderer(MyReactComponent)
	},
})

const textOptions: TLTextOptions = {
	tipTapConfig: {
		extensions: [...tipTapDefaultExtensions, MyReactComponentExtension],
	},
	alwaysRenderTipTap: true,
}

const defaultRichTextContent = {
	type: 'doc',
	content: [
		{
			type: 'paragraph',
			content: [{ type: 'text', text: 'This is a text shape with a react component in it.' }],
		},
		{
			type: 'reactComponent',
			attrs: { count: 0 },
		},
		{
			type: 'paragraph',
			content: [{ type: 'text', text: 'We are really living in the future.' }],
		},
	],
}

export default function RichTextReactExtension() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				textOptions={textOptions}
				onMount={(editor) => {
					const sampleShapeId = createShapeId('sample shape')
					editor
						.deleteShape(sampleShapeId)
						.createShape({
							type: 'text',
							id: sampleShapeId,
							props: {
								richText: defaultRichTextContent,
							},
						})
						.selectAll()
						.zoomToSelection()
				}}
			/>
		</div>
	)
}
