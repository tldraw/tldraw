import {
	TypeValidator,
	arrayOfValidator,
	numberValidator,
	objectValidator,
	pointValidator,
	positiveNumberValidator,
	setEnumValidator,
} from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLColor, colorTypeValidator } from './TLColor'
import { Vec2dModel } from './geometry-types'

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
	color: TLColor
	opacity: number
	state: SetValue<typeof TL_SCRIBBLE_STATES>
	delay: number
}

/** @internal */
export const scribbleValidator: TypeValidator<TLScribble> = objectValidator({
	points: arrayOfValidator(pointValidator),
	size: positiveNumberValidator,
	color: colorTypeValidator,
	opacity: numberValidator,
	state: setEnumValidator(TL_SCRIBBLE_STATES),
	delay: numberValidator,
})
