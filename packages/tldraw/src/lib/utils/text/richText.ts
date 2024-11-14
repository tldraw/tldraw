import { Renderer } from '@cristata/prosemirror-to-html-js'
import { Editor } from '@tldraw/editor'
import { DOMSerializer, Node, Schema } from 'prosemirror-model'
import { schema } from 'prosemirror-schema-basic'
import { addListNodes } from 'prosemirror-schema-list'

// Mix the nodes from prosemirror-schema-list into the basic schema to
// create a schema with list support.
/** @internal */
export const tldrawProseMirrorSchema = new Schema({
	nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
	marks: schema.spec.marks,
})

/** @public */
export function renderHtmlFromRichText(richText: string) {
	const renderer = new Renderer()
	// We replace empty paragraphs with a single line break to prevent the browser from collapsing them.
	return renderer.render(JSON.parse(richText)).replaceAll('<p></p>', '<p><br /></p>')
}

/** @public */
export function renderHtmlFromRichTextForMeasurement(richText: string) {
	const html = renderHtmlFromRichText(richText)
	return `<div class="ProseMirror">${html}</div>`
}

/**
 * XXX: I added this function (cc Alex) so that we'd start passing around DOM nodes instead of HTML strings.
 * However, one tricky thing is blank lines that currently get ignored during text measurement.
 * @public
 */
export function renderDOMNodeFromRichTextForMeasurement(editor: Editor, richText: string) {
	const schema = editor.getTextOptions().proseMirrorConfig?.schema
	if (!schema) return

	const wrapper = document.createElement('div')
	wrapper.className = 'ProseMirror'
	const node = Node.fromJSON(schema, JSON.parse(richText))
	DOMSerializer.fromSchema(schema).serializeFragment(node.content, { document }, wrapper)
	return wrapper
}

/** @public */
export function renderPlaintextFromRichText(editor: Editor, richText: string) {
	const schema = editor.getTextOptions().proseMirrorConfig?.schema
	if (!schema) return

	const node = Node.fromJSON(schema, JSON.parse(richText))
	return node.textBetween(0, node.nodeSize - 2, '\n')
}
