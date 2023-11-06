import { ComponentType } from 'react'

/** @public */
export type TLInFrontOfTheCanvas = ComponentType<object>

/** @public */
export const DefaultInFrontOfTheCanvas: TLInFrontOfTheCanvas = () => {
	return <div className="tl-things-in-front-of-the-canvas" />
}
