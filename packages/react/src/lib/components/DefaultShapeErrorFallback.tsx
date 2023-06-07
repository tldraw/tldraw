/** @public */
export type TLShapeErrorFallbackComponent = (props: { error: unknown }) => any | null

/** @internal */
export const DefaultShapeErrorFallback: TLShapeErrorFallbackComponent = () => {
	return <div className="tl-shape-error-boundary" />
}
