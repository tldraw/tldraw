/** @public */
export type TLShapeErrorFallback = (props: { error: unknown }) => any | null

/** @internal */
export const DefaultShapeErrorFallback: TLShapeErrorFallback = () => {
	return <div className="tl-shape-error-boundary" />
}
