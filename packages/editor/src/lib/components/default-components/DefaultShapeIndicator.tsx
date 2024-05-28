import { useQuickReactor, useStateTracking, useValue } from '@tldraw/state'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import classNames from 'classnames'
import { memo, useLayoutEffect, useRef } from 'react'
import type { Editor } from '../../editor/Editor'
import { ShapeUtil } from '../../editor/shapes/ShapeUtil'
import { useEditor } from '../../hooks/useEditor'
import { useEditorComponents } from '../../hooks/useEditorComponents'
import { OptionalErrorBoundary } from '../ErrorBoundary'

// need an extra layer of indirection here to allow hooks to be used inside the indicator render
const EvenInnererIndicator = ({ shape, util }: { shape: TLShape; util: ShapeUtil<any> }) => {
	return useStateTracking('Indicator: ' + shape.type, () => util.indicator(shape))
}

const InnerIndicator = ({ editor, id }: { editor: Editor; id: TLShapeId }) => {
	const shape = useValue('shape for indicator', () => editor.store.get(id), [editor, id])

	const { ShapeIndicatorErrorFallback } = useEditorComponents()

	if (!shape || shape.isLocked) return null

	return (
		<OptionalErrorBoundary
			fallback={ShapeIndicatorErrorFallback}
			onError={(error) =>
				editor.annotateError(error, { origin: 'react.shapeIndicator', willCrashApp: false })
			}
		>
			<EvenInnererIndicator key={shape.id} shape={shape} util={editor.getShapeUtil(shape)} />
		</OptionalErrorBoundary>
	)
}

/** @public */
export interface TLShapeIndicatorProps {
	shapeId: TLShapeId
	color?: string | undefined
	opacity?: number
	className?: string
	hidden?: boolean
}

/** @public */
export const DefaultShapeIndicator = memo(function DefaultShapeIndicator({
	shapeId,
	className,
	color,
	hidden,
	opacity,
}: TLShapeIndicatorProps) {
	const editor = useEditor()

	const rIndicator = useRef<SVGSVGElement>(null)

	useQuickReactor(
		'indicator transform',
		() => {
			const elm = rIndicator.current
			if (!elm) return
			const pageTransform = editor.getShapePageTransform(shapeId)
			if (!pageTransform) return
			elm.style.setProperty('transform', pageTransform.toCssString())
		},
		[editor, shapeId]
	)

	useLayoutEffect(() => {
		const elm = rIndicator.current
		if (!elm) return
		elm.style.setProperty('display', hidden ? 'none' : 'block')
	}, [hidden])

	return (
		<svg ref={rIndicator} className={classNames('tl-overlays__item', className)}>
			<g className="tl-shape-indicator" stroke={color ?? 'var(--color-selected)'} opacity={opacity}>
				<InnerIndicator editor={editor} id={shapeId} />
			</g>
		</svg>
	)
})
