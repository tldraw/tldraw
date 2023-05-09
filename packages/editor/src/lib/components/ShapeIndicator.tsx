import { Matrix2d } from '@tldraw/primitives'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import classNames from 'classnames'
import * as React from 'react'
import {
	// @ts-expect-error 'private' export
	useStateTracking,
	useValue,
} from 'signia-react'
import { useApp } from '../..'
import type { App } from '../app/App'
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

export const ShapeIndicator = React.memo(function ShapeIndicator({
	id,
	isHinting,
	color,
}: {
	id: TLShapeId
	isHinting?: boolean
	color?: string
}) {
	const app = useApp()

	const transform = useValue(
		'transform',
		() => {
			const pageTransform = app.getPageTransformById(id)
			if (!pageTransform) return ''
			return Matrix2d.toCssString(pageTransform)
		},
		[app, id]
	)

	return (
		<svg className="tl-svg-origin-container">
			<g
				className={classNames('tl-shape-indicator', {
					'tl-shape-indicator__hinting': isHinting,
				})}
				transform={transform}
				stroke={color ?? 'var(--color-selected)'}
			>
				<InnerIndicator app={app} id={id} />
			</g>
		</svg>
	)
})

export type TLShapeIndicatorComponent = (props: {
	id: TLShapeId
	isHinting?: boolean | undefined
	color?: string | undefined
}) => JSX.Element | null
