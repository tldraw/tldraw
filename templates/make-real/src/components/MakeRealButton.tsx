import { useCallback, useRef } from 'react'
import { Editor, TLShapeId, useEditor, useToasts, useValue } from 'tldraw'
import { makeReal } from '@/lib/makeReal'
import { makingRealShapeIdsAtom } from './MakeRealOverlay'

export function MakeRealButton() {
	const editor = useEditor()
	const { addToast } = useToasts()
	const abortControllerRef = useRef<AbortController | null>(null)

	const isMakingReal = useValue('isMakingReal', () => makingRealShapeIdsAtom.get().size > 0, [])

	const handleClick = useCallback(async () => {
		// If a request is in flight, this click is a "Stop" — abort and let finally clean up.
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
			return
		}

		const selectedShapes = editor.getSelectedShapes()
		if (selectedShapes.length === 0) {
			addToast({
				icon: 'info-circle',
				title: 'First select something to make real.',
			})
			return
		}

		const selectedIds = selectedShapes.map((s) => s.id)
		lockShapes(editor, selectedIds, true)
		setMakingReal(selectedIds, true)

		const controller = new AbortController()
		abortControllerRef.current = controller

		try {
			await makeReal(editor, { signal: controller.signal })
		} catch (e) {
			if (!controller.signal.aborted) {
				console.error(e)
				addToast({
					icon: 'info-circle',
					title: 'Something went wrong',
					description: (e as Error).message.slice(0, 200),
				})
			}
		} finally {
			lockShapes(editor, selectedIds, false)
			setMakingReal(selectedIds, false)
			abortControllerRef.current = null
		}
	}, [editor, addToast])

	return (
		<button
			className={`makeRealButton${isMakingReal ? ' makeRealButton--stop' : ''}`}
			onClick={handleClick}
		>
			{isMakingReal ? 'Stop' : 'Make real'}
		</button>
	)
}

function lockShapes(editor: Editor, ids: TLShapeId[], isLocked: boolean) {
	editor.run(
		() => {
			for (const id of ids) {
				const shape = editor.getShape(id)
				if (!shape) continue
				editor.updateShape({
					...shape,
					isLocked,
					meta: { ...shape.meta, makingReal: isLocked },
				})
			}
		},
		{ ignoreShapeLock: true, history: 'ignore' }
	)
}

function setMakingReal(ids: TLShapeId[], makingReal: boolean) {
	const next = new Set(makingRealShapeIdsAtom.get())
	for (const id of ids) {
		if (makingReal) next.add(id)
		else next.delete(id)
	}
	makingRealShapeIdsAtom.set(next)
}
