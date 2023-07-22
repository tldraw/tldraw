import { ComponentType } from 'react'

/** @public */
export type TLShapeErrorFallbackComponent = ComponentType<{ error: any }>

/** @internal */
export const DefaultShapeErrorFallback: TLShapeErrorFallbackComponent = ({
	error,
}: {
	error: any
}) => {
	return <div className="tl-shape-error-boundary">{error}</div>
}
