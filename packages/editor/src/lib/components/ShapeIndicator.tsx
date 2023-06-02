import { TLShape, TLShapeId } from '@tldraw/tlschema'
import classNames from 'classnames'
import * as React from 'react'
import {
	// @ts-expect-error 'private' export
	useStateTracking,
	useValue,
} from 'signia-react'
import { useEditor } from '../..'
import type { App } from '../app/Editor'
import { TLShapeUtil } from '../app/shapeutils/TLShapeUtil'
import { useEditorComponents } from '../hooks/useEditorComponents'
import { OptionalErrorBoundary } from './ErrorBoundary'

class ShapeWithPropsEquality {
	constructor(public shape: TLShape | undefined) {}
	equals(other: ShapeWithPropsEquality) {
		return this.shape?.props === other?.shape?.props
	}
}

// need an extra layer of indirection here to allow hooks to be used inside the indicator render
const EvenInnererIndicator = ({ shape, util }: { shape: TLShape; util: TLShapeUtil<any> }) => {
	return useStateTracking('Indicator:' + shape.type, () => util.indicator(shape))
}

export const InnerIndicator = ({ app, id }: { app: App; id: TLShapeId }) => {
	const shape = useValue('shape', () => new ShapeWithPropsEquality(app.store.get(id)), [app, id])

	const { ShapeIndicatorErrorFallback } = useEditorComponents()

	if (!shape.shape) return null
	return (
		<OptionalErrorBoundary
			fallback={
				ShapeIndicatorErrorFallback
					? (error) => <ShapeIndicatorErrorFallback error={error} />
					: null
			}
			onError={(error) =>
				app.annotateError(error, { origin: 'react.shapeIndicator', willCrashApp: false })
			}
		>
			<EvenInnererIndicator
				key={shape.shape.id}
				shape={shape.shape}
				util={app.getShapeUtil(shape.shape)}
			/>
		</OptionalErrorBoundary>
	)
}

export type TLShapeIndicatorComponent = (props: {
	id: TLShapeId
	color?: string | undefined
	opacity?: number
	className?: string
}) => JSX.Element | null

const _ShapeIndicator: TLShapeIndicatorComponent = ({ id, className, color, opacity }) => {
	const app = useEditor()

	const transform = useValue(
		'transform',
		() => {
			const pageTransform = app.getPageTransformById(id)
			if (!pageTransform) return ''
			return pageTransform.toCssString()
		},
		[app, id]
	)

	return (
		<svg className={classNames('tl-overlays__item', className)}>
			<g
				className="tl-shape-indicator"
				transform={transform}
				stroke={color ?? 'var(--color-selected)'}
				opacity={opacity}
			>
				<InnerIndicator app={app} id={id} />
			</g>
		</svg>
	)
}

export const ShapeIndicator = React.memo(_ShapeIndicator)
