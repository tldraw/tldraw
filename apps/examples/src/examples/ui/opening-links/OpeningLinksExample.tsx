import { createContext, useContext, useEffect, useState } from 'react'
import { Editor, openWindow, TLComponents, Tldraw, TLRichText, toRichText, useEditor } from 'tldraw'
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

const HideUiContext = createContext({ hideUi: false, setHideUi: (_hideUi: boolean) => {} })

// [2]
function ConfirmLinkWithoutUi() {
	const editor = useEditor()
	const { hideUi, setHideUi } = useContext(HideUiContext)
	const [pendingUrl, setPendingUrl] = useState<string | null>(null)

	useEffect(() => {
		if (!hideUi) return
		const handleConfirmOpenLink = ({ url }: { url: string }) => setPendingUrl(url)
		editor.on('confirm-open-link', handleConfirmOpenLink)
		return () => {
			editor.off('confirm-open-link', handleConfirmOpenLink)
			setPendingUrl(null)
		}
	}, [editor, hideUi])

	return (
		<div
			style={{
				position: 'absolute',
				top: 8,
				left: '50%',
				transform: 'translateX(-50%)',
				pointerEvents: 'all',
			}}
			onPointerDown={editor.markEventAsHandled}
		>
			<label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
				<input type="checkbox" checked={hideUi} onChange={(e) => setHideUi(e.target.checked)} />
				Hide the UI and confirm links with a custom prompt
			</label>
			{pendingUrl && (
				<div style={{ marginTop: 8, padding: 8, background: 'white', border: '1px solid #ccc' }}>
					<p style={{ margin: '0 0 8px' }}>Open {pendingUrl}?</p>
					<button
						onClick={() => {
							openWindow(pendingUrl, '_blank')
							setPendingUrl(null)
						}}
					>
						Open
					</button>{' '}
					<button onClick={() => setPendingUrl(null)}>Cancel</button>
				</div>
			)}
		</div>
	)
}

const components: TLComponents = { InFrontOfTheCanvas: ConfirmLinkWithoutUi }

export default function OpeningLinksExample() {
	const [hideUi, setHideUi] = useState(false)
	return (
		<HideUiContext.Provider value={{ hideUi, setHideUi }}>
			<div className="tldraw__editor">
				<Tldraw
					persistenceKey="opening-links-example"
					hideUi={hideUi}
					components={components}
					onMount={createShapes}
				/>
			</div>
		</HideUiContext.Provider>
	)
}

/*
[1]
`toRichText` makes plain text, so build the rich text by hand to give each line a link mark. In
the app, you'd select some text and use the link button on the rich text toolbar.

[2]
With `hideUi`, nothing answers `confirm-open-link`, so links into unknown apps don't open. This
component listens for the event only while the UI is hidden, since the default UI already shows a
dialog, and opens the link with `openWindow` if the user agrees. Use your own UI for the prompt
rather than `window.confirm`, which blocks the page.
*/
