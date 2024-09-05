import { useSyncDemo } from '@tldraw/sync'
import { TLComponents, Tldraw, atom, track, useEditor } from 'tldraw'
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
									const allAffectedShapes = [
										...editor.getShapeAndDescendantIds(myPrivateSelectedShapes.map((s) => s.id)),
									].map((id) => editor.getShape(id)!)
									editor.updateShapes(
										allAffectedShapes.map((shape) => ({
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
				onMount={(editor) => {
					editor.store.sideEffects.registerBeforeCreateHandler('shape', (shape) => {
						if ('private' in shape.meta) return shape
						return {
							...shape,
							meta: {
								...shape.meta,
								private: isPrivateDrawingMode.get(),
								ownerId: editor.user.getId(),
							},
						}
					})
				}}
				components={components}
			/>
		</div>
	)
}
