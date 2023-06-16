import { T } from '@tldraw/validate'

/** @public */
export type TLOpacityType = number

/** @internal */
export const opacityValidator = T.number.check((n) => {
	if (n < 0 || n > 1) {
		throw new T.ValidationError('Opacity must be between 0 and 1')
	}
})
