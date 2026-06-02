import { useQuickReactor } from '@tldraw/state-react'
import { useEffect } from 'react'
import { TLShapeId, useEditor } from 'tldraw'
import { applyClipPathOverride, clearClipPathOverride } from './applyClipPathOverride'
import { computePageMask, toClipPathCss } from './computeClipMask'
import { legacySegmentShIntersect } from './legacySegmentShIntersect'

/** Replace the SDK clip-path on one shape with the pre-fix intersection result. */
export function LegacyClipPathLayer({ shapeId }: { shapeId: TLShapeId }) {
	const editor = useEditor()

	useQuickReactor(
		'apply legacy clip-path',
		() => {
			const pageMask = computePageMask(editor, shapeId, legacySegmentShIntersect)
			const clipPath = pageMask ? toClipPathCss(editor, shapeId, pageMask) : undefined
			applyClipPathOverride(editor, shapeId, clipPath)
		},
		[editor, shapeId]
	)

	useEffect(() => () => clearClipPathOverride(editor, shapeId), [editor, shapeId])

	return null
}
