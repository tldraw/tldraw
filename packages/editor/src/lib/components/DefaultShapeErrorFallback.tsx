/** @public */
export type TLShapeErrorFallbackComponent = (props: { error: any }) => any | null

/** @internal */
export const DefaultShapeErrorFallback: TLShapeErrorFallbackComponent = ({
	error,
}: {
	error: any
}) => {
	return <div className="tl-shape-error-boundary">{error}</div>
}
