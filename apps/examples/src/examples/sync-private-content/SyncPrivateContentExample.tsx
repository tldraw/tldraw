import { useSyncDemo } from '@tldraw/sync'
import React from 'react'
import {
	Atom,
	TLComponents,
	Tldraw,
	react,
	useAtom,
	useEditor,
	useIsToolSelected,
	useTools,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { VisibilityOff, VisibilityOn } from '../../icons/icons'
import { Toggle } from './Toggle'
import './style.css'

// There's a guide at the bottom of this file!

// [1]
const PrivateModeContext = React.createContext<null | Atom<boolean>>(null)

const components: TLComponents = {
	// [2]
	InFrontOfTheCanvas: () => {
		const editor = useEditor()
		const isInSelectTool = useIsToolSelected(useTools().select)
		const userId = useValue('userId', () => editor.user.getId(), [])
		const myPrivateSelectedShapes = useValue(
			'private shapes',
			() =>
				editor
					.getSelectedShapes()
					.filter((shape) => !!shape.meta.private && shape.meta.ownerId === userId),
			[editor, userId]
		)

		// [3]
		const isPrivateMode$ = React.useContext(PrivateModeContext)!
		const isPrivateMode = useValue(isPrivateMode$)

		return (
			<>
				{isInSelectTool && myPrivateSelectedShapes.length > 0 ? (
					<div className="toggle-panel">
						<div>
							Make {myPrivateSelectedShapes.length} selected shape
							{myPrivateSelectedShapes.length > 1 ? 's' : ''} public?{' '}
						</div>
						<button
							onClick={() => {
								editor.markHistoryStoppingPoint()
								// [7]
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
					</div>
				) : (
					<div className="toggle-panel pointer" onClick={() => isPrivateMode$.update((v) => !v)}>
						{isPrivateMode ? <VisibilityOff fill="#444" /> : <VisibilityOn fill="#444" />}
						<div>Private mode</div>
						<Toggle isChecked={isPrivateMode} />
					</div>
				)}
			</>
		)
	},
}
function App({ roomId }: { roomId: string }) {
	const store = useSyncDemo({ roomId })
	const isPrivateMode$ = React.useContext(PrivateModeContext)!
	return (
		<div className="tldraw__editor">
			<Tldraw
				store={store}
				deepLinks
				// [4]
				getShapeVisibility={(shape, editor) => {
					const userId = editor.user.getId()
					if (!!shape.meta.private && shape.meta.ownerId !== userId) {
						return 'hidden'
					}
					return 'inherit'
				}}
				onMount={(editor) => {
					// [5]
					editor.store.sideEffects.registerBeforeCreateHandler('shape', (shape) => {
						if ('private' in shape.meta) return shape
						return {
							...shape,
							meta: {
								...shape.meta,
								private: isPrivateMode$.get(),
								ownerId: editor.user.getId(),
							},
						}
					})

					// [6]
					return react('clean up selection', () => {
						const selectedShapes = editor.getSelectedShapes()
						const filteredSelectedShapes = selectedShapes.filter((s) => !editor.isShapeHidden(s))
						if (filteredSelectedShapes.length !== selectedShapes.length) {
							editor.select(...filteredSelectedShapes)
						}
					})
				}}
				components={components}
			/>
		</div>
	)
}

export default function SyncPrivateContentExample({ roomId }: { roomId: string }) {
	return (
		<PrivateModeContext.Provider value={useAtom('isPrivateDrawingMode', false)}>
			<App roomId={roomId} />
		</PrivateModeContext.Provider>
	)
}

/**
 * This example demonstrates how to create a 'private' drawing mode where any shapes created by one person cannot be seen by another.
 * It sets up a simple ownership system where each shape created is tagged with the id of the user who created it.
 * It also adds a boolean flag to each shape called 'private' which is set to true if the shape is created in private mode.
 * If the user selects one or more private shapes, they will be given the option to make them public.
 *
 * 1. We create a context to store the atom that will hold the state of the private drawing mode. We are using signals here but you can use any state management library you like.
 * 2. We override the `InFrontOfTheCanvas` component to add a tool panel at the top of the screen that allows the user to toggle private drawing mode on and off, and to make private shapes public.
 * 3. We use the context to get the atom that holds the state of the private drawing mode. We then have to call 'useValue' on the atom to get the current value in a reactive way.
 * 4. We override the `getShapeVisibility` function to hide shapes that are private and not owned by the current user.
 * 5. We register a side effect that adds the 'private' and 'ownerId' meta fields to each shape created. We set the 'private' field to the current value of the private drawing mode atom.
 * 6. We register a side effect that cleans up the selection by removing any hidden shapes from the selection. This re-runs whenever the selection or the hidden state of a selected shape changes.
 * 7. Child shapes (e.g inside groups and frames) do not inherit the 'private' meta property from their parent. So when making a shape public, we decide to also make all descendant shapes public since this is most likely what the user intended.
 */
