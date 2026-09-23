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
import { VisibilityOff, VisibilityOn } from '../../../icons/icons'
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
		const userId = useValue('userId', () => editor.user.getExternalId(), [editor])
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
				options={{ deepLinks: true }}
				// [4]
				getShapeVisibility={(shape, editor) => {
					const userId = editor.user.getExternalId()
					if (!!shape.meta.private && shape.meta.ownerId !== userId) {
						return 'hidden'
					}
					return 'inherit'
				}}
				onMount={(editor) => {
					// [5]
					const removeCreateHandler = editor.store.sideEffects.registerBeforeCreateHandler(
						'shape',
						(shape) => {
							if ('private' in shape.meta) return shape
							return {
								...shape,
								meta: {
									...shape.meta,
									private: isPrivateMode$.get(),
									ownerId: editor.user.getExternalId(),
								},
							}
						}
					)

					// [6]
					const stopCleaningSelection = react('clean up selection', () => {
						const selectedShapes = editor.getSelectedShapes()
						const filteredSelectedShapes = selectedShapes.filter((s) => !editor.isShapeHidden(s))
						if (filteredSelectedShapes.length !== selectedShapes.length) {
							editor.select(...filteredSelectedShapes)
						}
					})

					return () => {
						removeCreateHandler()
						stopCleaningSelection()
					}
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

/*
A 'private' drawing mode: shapes created while it is on are tagged with the creator's id and hidden
from everyone else. Selecting your own private shapes offers to make them public.

[1]
A context holding the atom for the private-mode flag. Signals are used here, but any state
container works.

[2]
The `InFrontOfTheCanvas` slot hosts a small panel that toggles private mode, or, when private shapes
are selected, offers to make them public.

[3]
`useValue` on the atom gives the panel a reactive read of the flag.

[4]
`getShapeVisibility` hides shapes that are private and owned by someone else. Hidden shapes are
still in the store and still sync; they're just not rendered or hittable for this user.

[5]
A before-create side effect stamps every new shape with `private` and `ownerId` meta. Because it
runs in the store, it covers every creation path (tools, paste, duplicate), not just the ones this
UI knows about. `onMount` returns a cleanup so the handler and the reaction below are removed when
the editor unmounts.

[6]
A reaction that drops hidden shapes from the selection. Without it, toggling private mode while a
now-hidden shape is selected would leave an invisible selection.

[7]
Child shapes inside groups and frames don't inherit their parent's `private` meta, so making a
shape public also makes its descendants public, which is what the user almost certainly meant.
*/
