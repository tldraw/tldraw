/** @public */
export type TLBackgroundComponent = () => JSX.Element | null

export function DefaultBackground() {
	return <div className="tl-background" />
}
