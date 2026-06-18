import { useEffect, useState } from 'react'
import {
	Editor,
	EditorProvider,
	PageRecordType,
	TLComponents,
	TLPage,
	TLPageId,
	Tldraw,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './page-panel.css'

// There's a guide at the bottom of this file!

// [1]
const components: TLComponents = {
	PageMenu: null,
}

export default function PagePanelExample() {
	const [editor, setEditor] = useState<Editor | null>(null)

	return (
		<div className="page-panel-layout">
			{/* [2] */}
			{editor && (
				<EditorProvider editor={editor}>
					<PagePanel />
				</EditorProvider>
			)}
			<div className="page-panel-canvas">
				<Tldraw persistenceKey="page-panel-example" components={components} onMount={setEditor} />
			</div>
		</div>
	)
}

function PagePanel() {
	const editor = useEditor()

	// [3]
	const pages = useValue('pages', () => editor.getPages(), [editor])
	const currentPageId = useValue('current page id', () => editor.getCurrentPageId(), [editor])

	// [4]
	function handleCreatePage() {
		const newPageId = PageRecordType.createId()
		editor.run(() => {
			editor.markHistoryStoppingPoint('creating page')
			editor.createPage({ id: newPageId, name: `Page ${pages.length + 1}` })
			editor.setCurrentPage(newPageId)
		})
	}

	function handleRenamePage(page: TLPage) {
		const name = window.prompt('Rename page', page.name)
		if (name && name !== page.name) {
			editor.markHistoryStoppingPoint('renaming page')
			editor.renamePage(page.id, name)
		}
	}

	function handleDeletePage(page: TLPage) {
		editor.markHistoryStoppingPoint('deleting page')
		editor.deletePage(page.id)
	}

	return (
		<div className="page-panel">
			<div className="page-panel-list">
				{pages.map((page, index) => (
					<div
						key={page.id}
						className="page-panel-item"
						data-iscurrent={page.id === currentPageId}
						onClick={() => editor.setCurrentPage(page.id)}
						onDoubleClick={() => handleRenamePage(page)}
					>
						<PageThumbnail pageId={page.id} />
						<div className="page-panel-item-footer">
							<span className="page-panel-item-index">{index + 1}</span>
							<span className="page-panel-item-name">{page.name}</span>
							{pages.length > 1 && (
								<button
									className="page-panel-item-delete"
									title="Delete page"
									onClick={(e) => {
										e.stopPropagation()
										handleDeletePage(page)
									}}
								>
									×
								</button>
							)}
						</div>
					</div>
				))}
			</div>
			<button className="page-panel-add" onClick={handleCreatePage}>
				+ New page
			</button>
		</div>
	)
}

function PageThumbnail({ pageId }: { pageId: TLPageId }) {
	const editor = useEditor()
	const [src, setSrc] = useState<string | null>(null)

	useEffect(() => {
		let isCancelled = false
		let timeout: ReturnType<typeof setTimeout> | undefined

		// [5]
		async function generateThumbnail() {
			const shapeIds = editor.getPageShapeIds(pageId)
			if (shapeIds.size === 0) {
				if (!isCancelled) setSrc(null)
				return
			}
			const result = await editor.getSvgString([...shapeIds], {
				background: false,
				padding: 16,
			})
			if (isCancelled || !result) return
			setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`)
		}

		generateThumbnail()

		// [6]
		const removeListener = editor.store.listen(
			() => {
				if (editor.getCurrentPageId() !== pageId) return
				clearTimeout(timeout)
				timeout = setTimeout(generateThumbnail, 300)
			},
			{ scope: 'document', source: 'user' }
		)

		return () => {
			isCancelled = true
			clearTimeout(timeout)
			removeListener()
		}
	}, [editor, pageId])

	return (
		<div className="page-panel-thumbnail">
			{src ? <img src={src} alt="" /> : <span className="page-panel-thumbnail-empty">Empty</span>}
		</div>
	)
}

/*
This example shows how to replace the built-in page menu with a custom page
panel in your own DOM, outside the canvas, with live thumbnail previews of
every page.

The canvas only renders the shapes of the current page, so we export the
other pages as images to show their previews.

[1]
Hide the built-in page menu by overriding the `PageMenu` component with null.

[2]
Use the `onMount` prop to grab the editor instance and store it in React
state. Wrapping external components in `EditorProvider` lets them use
`useEditor` and `useValue` even though they're rendered outside `<Tldraw />`.

[3]
`editor.getPages()` is a computed (reactive) value backed by a store query for
all page records, sorted by index. Reading it inside `useValue` means this
component re-renders automatically whenever pages are created, deleted,
renamed, or reordered.

[4]
Create the page with an explicit id so we can navigate to it right away.
`editor.run` batches the two changes, and `markHistoryStoppingPoint` makes the
whole thing a single undo step. Note that `editor.deletePage` automatically
switches to another page if you delete the current one.

[5]
The canvas never renders pages other than the current one, so we export them
as images instead. `editor.getPageShapeIds(pageId)` returns the
shape ids on any page (not just the current one), and `editor.getSvgString`
can export shapes from any page. We turn the SVG string into a data URL for a
plain <img> tag.

[6]
Regenerate the thumbnail when the document changes, debounced so we don't
re-export on every pointer move. Local edits can only affect the current
page, so each thumbnail skips changes made while another page is active. In a
multiplayer app you'd also listen to remote changes (source: 'all') and check
which page the changed shapes belong to.
*/
