/** @public */
export type TLHandlesProps = {
	children: any
}

/** @public */
export const DefaultHandles = ({ children }: TLHandlesProps) => {
	return <svg className="tl-user-handles tl-overlays__item">{children}</svg>
}
