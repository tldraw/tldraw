import { Vec2dModel } from '@tldraw/primitives'
import { T } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLUIColor, uiColorTypeValidator } from './TLUIColor'

/**
 * The scribble states used by tldraw.
 *
 *  @public */
export const TL_SCRIBBLE_STATES = new Set(['starting', 'paused', 'active', 'stopping'] as const)

/**
 * A type for the scribble used by tldraw.
 *
 * @public */
export type TLScribble = {
	points: Vec2dModel[]
	size: number
	color: TLUIColor
	opacity: number
	state: SetValue<typeof TL_SCRIBBLE_STATES>
	delay: number
}

/** @internal */
export const scribbleValidator: T.Validator<TLScribble> = T.object({
	points: T.arrayOf(T.point),
	size: T.positiveNumber,
	color: uiColorTypeValidator,
	opacity: T.number,
	state: T.setEnum(TL_SCRIBBLE_STATES),
	delay: T.number,
})
