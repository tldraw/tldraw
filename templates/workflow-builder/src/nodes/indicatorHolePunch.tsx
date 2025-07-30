import { Editor, TLShapeId } from 'tldraw'
import { EditorState } from '../utils'

const indicatorHolePunchState = new EditorState<
	Set<{ shapeId: TLShapeId; x: number; y: number; radius: number }>
>('indicator hole punch', () => {
	console.log('create indicator hole punch state')
	return new Set()
})

export function createIndicatorHolePunch(
	editor: Editor,
	shapeId: TLShapeId,
	x: number,
	y: number,
	radius: number
) {
	const entry = { shapeId, x, y, radius }
	indicatorHolePunchState.update(editor, (state) => {
		const newState = new Set(state)
		newState.add(entry)
		return newState
	})

	return () => {
		indicatorHolePunchState.update(editor, (state) => {
			const newState = new Set(state)
			newState.delete(entry)
			return newState
		})
	}
}

export function getIndicatorHolePunchesForShape(editor: Editor, shapeId: TLShapeId) {
	return Array.from(indicatorHolePunchState.get(editor)).filter(
		(entry) => entry.shapeId === shapeId
	)
}
