import { T } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLCanvasUiColor, canvasUiColorTypeValidator } from './TLColor'
import { Vec2dModel, vec2dModelValidator } from './geometry-types'

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
	id: string
	points: Vec2dModel[]
	size: number
	color: TLCanvasUiColor
	opacity: number
	state: SetValue<typeof TL_SCRIBBLE_STATES>
	delay: number
	shrink: number
	taper: boolean
}

/** @internal */
export const scribbleValidator: T.Validator<TLScribble> = T.object({
	id: T.string,
	points: T.arrayOf(vec2dModelValidator),
	size: T.positiveNumber,
	color: canvasUiColorTypeValidator,
	opacity: T.number,
	state: T.setEnum(TL_SCRIBBLE_STATES),
	delay: T.number,
	shrink: T.number,
	taper: T.boolean,
})
