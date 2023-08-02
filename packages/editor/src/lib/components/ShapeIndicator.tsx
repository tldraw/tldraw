import { useStateTracking, useValue } from '@tldraw/state'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import classNames from 'classnames'
import * as React from 'react'
import { useEditor } from '../..'
import type { Editor } from '../editor/Editor'
import { ShapeUtil } from '../editor/shapes/ShapeUtil'
import { useEditorComponents } from '../hooks/useEditorComponents'
import { OptionalErrorBoundary } from './ErrorBoundary'

class ShapeWithPropsEquality {
	constructor(public shape: TLShape | undefined) {}
	equals(other: ShapeWithPropsEquality) {
		return this.shape?.props === other?.shape?.props && this.shape?.meta === other?.shape?.meta
	}
}

// need an extra layer of indirection here to allow hooks to be used inside the indicator render
const EvenInnererIndicator = ({ shape, util }: { shape: TLShape; util: ShapeUtil<any> }) => {
	return useStateTracking('Indicator:' + shape.type, () => util.indicator(shape))
}

export const InnerIndicator = ({ editor, id }: { editor: Editor; id: TLShapeId }) => {
	const shape = useValue('shape', () => new ShapeWithPropsEquality(editor.store.get(id)), [
		editor,
		id,
	])

	const { ShapeIndicatorErrorFallback } = useEditorComponents()

	if (!shape.shape || shape.shape.isLocked) return null

	return (
		<OptionalErrorBoundary
			fallback={ShapeIndicatorErrorFallback}
			onError={(error) =>
				editor.annotateError(error, { origin: 'react.shapeIndicator', willCrashApp: false })
			}
		>
			<EvenInnererIndicator
				key={shape.shape.id}
				shape={shape.shape}
				util={editor.getShapeUtil(shape.shape)}
			/>
		</OptionalErrorBoundary>
	)
}

/** @public */
export type TLShapeIndicatorComponent = React.ComponentType<{
	id: TLShapeId
	color?: string | undefined
	opacity?: number
	className?: string
}>

const _ShapeIndicator: TLShapeIndicatorComponent = ({ id, className, color, opacity }) => {
	const editor = useEditor()

	const transform = useValue(
		'transform',
		() => {
			const pageTransform = editor.getShapePageTransform(id)
			if (!pageTransform) return ''
			return pageTransform.toCssString()
		},
		[editor, id]
	)

	return (
		<svg className={classNames('tl-overlays__item', className)}>
			<g
				className="tl-shape-indicator"
				transform={transform}
				stroke={color ?? 'var(--color-selected)'}
				opacity={opacity}
			>
				<InnerIndicator editor={editor} id={id} />
			</g>
		</svg>
	)
}

/** @public */
export const ShapeIndicator = React.memo(_ShapeIndicator)
