import { useSyncDemo } from '@tldraw/sync'
import { PageRecordType, TLComponents, Tldraw, atom, track, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

const isPrivateDrawingMode = atom('isPrivateDrawingMode', false)

const components: TLComponents = {
	InFrontOfTheCanvas: track(() => {
		const editor = useEditor()
		const isInSelectTool = editor.isIn('select')
		const userId = editor.user.getId()
		const myPrivateSelectedShapes = editor
			.getSelectedShapes()
			.filter((shape) => !!shape.meta.private && shape.meta.ownerId === userId)

		const ownsPage = editor.getCurrentPage().meta.ownerId === userId
		const currentPageIsPrivate = !!editor.getCurrentPage().meta.private

		return (
			<>
				<div
					style={{
						position: 'absolute',
						top: 10,
						left: '50%',
						transform: 'translateX(-50%)',
						borderRadius: 8,
						background: '#efefef',
						boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.1)',
						padding: '9px 15px',
					}}
				>
					{isInSelectTool && myPrivateSelectedShapes.length > 0 ? (
						<>
							Make {myPrivateSelectedShapes.length} selected shape
							{myPrivateSelectedShapes.length > 1 ? 's' : ''} public?{' '}
							<button
								onClick={() => {
									editor.updateShapes(
										myPrivateSelectedShapes.map((shape) => ({
											...shape,
											meta: { ...shape.meta, private: false },
										}))
									)
								}}
							>
								Yes
							</button>
						</>
					) : (
						<>
							Private Drawing Mode
							<input
								type="checkbox"
								checked={isPrivateDrawingMode.get()}
								onChange={(e) => isPrivateDrawingMode.set(e.target.checked)}
							/>
						</>
					)}
				</div>

				{ownsPage && (
					<div
						style={{
							position: 'absolute',
							top: 50,
							left: 10,
							borderRadius: 8,
							background: '#efefef',
							boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.1)',
							padding: '9px 15px',
						}}
					>
						Toggle private page
						<input
							type="checkbox"
							checked={currentPageIsPrivate}
							onChange={() =>
								editor.updatePage({
									...editor.getCurrentPage(),
									meta: { private: !currentPageIsPrivate, ownerId: userId },
								})
							}
						/>
					</div>
				)}
			</>
		)
	}),
}

export default function SyncDemoExample({ roomId }: { roomId: string }) {
	const store = useSyncDemo({ roomId })
	return (
		<div className="tldraw__editor">
			<Tldraw
				store={store}
				deepLinks
				isShapeHidden={(shape, editor) => {
					const userId = editor.user.getId()
					return !!shape.meta.private && shape.meta.ownerId !== userId
				}}
				isPageHidden={(page, editor) => {
					const userId = editor.user.getId()
					return !!page.meta.private && page.meta.ownerId !== userId
				}}
				onMount={(editor) => {
					editor.store.sideEffects.registerBeforeCreateHandler('shape', (shape) => {
						if ('private' in shape.meta) return shape
						return {
							...shape,
							meta: {
								...shape.meta,
								private: isPrivateDrawingMode.get() && !editor.getCurrentPage().meta.private,
								ownerId: editor.user.getId(),
							},
						}
					})
					editor.store.sideEffects.registerBeforeCreateHandler('page', (page) => {
						if ('private' in page.meta) return page
						return {
							...page,
							meta: {
								...page.meta,
								private: false,
								ownerId: editor.user.getId(),
							},
						}
					})
					// handle the case where the user is on a page that is made private by somebody else
					const cleanupCurrentPage = () => {
						const pages = editor.getPages()
						if (pages.length === 0) {
							const pageId = PageRecordType.createId()
							editor.createPage({ id: pageId, name: 'Page 1' })
							editor.setCurrentPage(pageId)
						} else if (!pages.find((p) => p.id === editor.getCurrentPageId())) {
							editor.setCurrentPage(pages[0].id)
						}
					}
					editor.store.sideEffects.registerAfterChangeHandler('page', cleanupCurrentPage)
					// need to apply it to 'after delete' events too, because tldraw's internal logic
					// doesn't know about the visibility rules (i should fix this)
					editor.store.sideEffects.registerAfterDeleteHandler('page', cleanupCurrentPage)
					cleanupCurrentPage()
				}}
				components={components}
			/>
		</div>
	)
}
