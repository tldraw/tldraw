import { useEffect, useRef } from 'react'
import { TLShape, react, useEditor } from 'tldraw'

export function useChangedShapesReactor(
	cb: (info: { culled: TLShape[]; restored: TLShape[] }) => void
) {
	const editor = useEditor()
	const rPrevShapes = useRef(editor.getRenderingShapes())

	useEffect(() => {
		return react('when rendering shapes change', () => {
			const after = editor.getRenderingShapes()
			const before = rPrevShapes.current

			const culled: TLShape[] = []
			const restored: TLShape[] = []

			const beforeToVisit = new Set(before)

			for (const afterInfo of after) {
				const beforeInfo = before.find((s) => s.id === afterInfo.id)
				if (!beforeInfo) {
					continue
				} else {
					if (afterInfo.isCulled && !beforeInfo.isCulled) {
						culled.push(afterInfo.shape)
					} else if (!afterInfo.isCulled && beforeInfo.isCulled) {
						restored.push(afterInfo.shape)
					}
					beforeToVisit.delete(beforeInfo)
				}
			}

			rPrevShapes.current = after

			cb({
				culled,
				restored,
			})
		})
	}, [cb, editor])
}
