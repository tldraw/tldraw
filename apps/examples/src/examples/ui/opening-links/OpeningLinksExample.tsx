import { Editor, Tldraw, TLRichText, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

const trustedLink = 'vscode://file/src/index.ts'
const unknownAppLink = 'chatgpt://chat/123'

// [1]
function richTextWithLinks(links: string[]): TLRichText {
	return {
		type: 'doc',
		content: links.map((href) => ({
			type: 'paragraph',
			content: [{ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }],
		})),
	}
}

function createShapes(editor: Editor) {
	if (editor.getCurrentPageShapeIds().size > 0) return

	editor.createShapes([
		{
			type: 'geo',
			x: 100,
			y: 100,
			props: { w: 240, h: 120, url: 'https://tldraw.dev', richText: toRichText('Web link') },
		},
		{
			type: 'geo',
			x: 380,
			y: 100,
			props: { w: 240, h: 120, url: trustedLink, richText: toRichText('Known app link') },
		},
		{
			type: 'geo',
			x: 660,
			y: 100,
			props: { w: 240, h: 120, url: unknownAppLink, richText: toRichText('Unknown app link') },
		},
		{ type: 'bookmark', x: 100, y: 300, props: { url: trustedLink } },
		{ type: 'bookmark', x: 480, y: 300, props: { url: unknownAppLink } },
		{
			type: 'note',
			x: 100,
			y: 500,
			props: { richText: richTextWithLinks(['https://tldraw.dev', trustedLink, unknownAppLink]) },
		},
	])
}

export default function OpeningLinksExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="opening-links-example" onMount={createShapes} />
		</div>
	)
}

/*
[1]
`toRichText` makes plain text, so build the rich text by hand to give each line a link mark. In
the app, you'd select some text and use the link button on the rich text toolbar.
*/
