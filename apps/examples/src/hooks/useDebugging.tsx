import { TLShapeId, TLUiActionItem, TLUiOverrides, atom } from 'tldraw'

export const trackedShapes = atom('tracked shapes', [] as TLShapeId[])

export function useDebuggingTools(): TLUiOverrides {
	return {
		actions(editor, actions) {
			actions['log-shapes'] = {
				id: 'log-shapes',
				onSelect: () => {
					const selectedShapes = editor.getSelectedShapes()
					switch (selectedShapes.length) {
						case 0:
							// eslint-disable-next-line no-console
							console.log('No shapes selected')
							break
						case 1:
							// eslint-disable-next-line no-console
							console.log(selectedShapes[0])
							break
						default:
							// eslint-disable-next-line no-console
							console.log(selectedShapes)
							break
					}
				},
				label: 'Log shapes',
				readonlyOk: true,
				kbd: '?!l',
			} as TLUiActionItem

			actions['track-changes'] = {
				id: 'track-changes',
				onSelect: () => {
					const oneShape = editor.getOnlySelectedShape()
					if (!oneShape) return
					const alreadyTracked = trackedShapes.get().includes(oneShape.id)
					if (alreadyTracked) {
						trackedShapes.set(trackedShapes.get().filter((id) => id !== oneShape.id))
					} else {
						trackedShapes.set([...trackedShapes.get(), oneShape.id])
					}
				},
				label: 'Track changes',
				checkbox: true,
				readonlyOk: true,
			} as TLUiActionItem

			return actions
		},
	}
}
