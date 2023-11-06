import { ComponentType, useRef } from 'react'
import { useTransform } from '../../hooks/useTransform'

/** @public */
export type TLOnTheCanvas = ComponentType<object>

/** @public */
export const DefaultOnTheCanvas: TLOnTheCanvas = () => {
	const rContainer = useRef<HTMLDivElement>(null)
	useTransform(rContainer, 0, 0)

	return <div className="tl-things-on-the-canvas" ref={rContainer} />
}
