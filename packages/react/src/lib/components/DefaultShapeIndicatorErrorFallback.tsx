/** @public */
export type TLShapeIndicatorErrorFallback = (props: { error: unknown }) => any | null

/** @internal */
export const DefaultShapeIndicatorErrorFallback: TLShapeIndicatorErrorFallback = () => {
	return <circle cx={4} cy={4} r={8} strokeWidth="1" stroke="red" />
}
