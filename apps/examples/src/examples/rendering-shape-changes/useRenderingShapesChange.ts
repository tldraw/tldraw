import { useEffect, useRef } from 'react'
import { TLShape, react, useEditor } from 'tldraw'

export function useChangedShapesReactor(
	cb: (info: { culled: TLShape[]; restored: TLShape[] }) => void
) {
	const editor = useEditor()
	const rPrevShapes = useRef({
		renderingShapes: editor.getRenderingShapes(),
		culledShapes: editor.getCulledShapes(),
	})

	useEffect(() => {
		return react('when rendering shapes change', () => {
			const after = {
				culledShapes: editor.getCulledShapes(),
				renderingShapes: editor.getRenderingShapes(),
			}
			const before = rPrevShapes.current

			const culled: TLShape[] = []
			const restored: TLShape[] = []

			const beforeToVisit = new Set(before.renderingShapes)

			for (const afterInfo of after.renderingShapes) {
				const beforeInfo = before.renderingShapes.find((s) => s.id === afterInfo.id)
				if (!beforeInfo) {
					continue
				} else {
					const isAfterCulled = after.culledShapes.has(afterInfo.id)
					const isBeforeCulled = before.culledShapes.has(beforeInfo.id)
					if (isAfterCulled && !isBeforeCulled) {
						culled.push(afterInfo.shape)
					} else if (!isAfterCulled && isBeforeCulled) {
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
