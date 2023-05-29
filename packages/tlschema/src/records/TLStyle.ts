import { T } from '@tldraw/tlvalidate'

/** @public */
export interface TLStyle {
	id: string
	type: string // color
	theme?: string // light
	variant?: string // semi
	value?: string | number // #0000ff
}

/** @public */
export const styleValidator: T.Validator<TLStyle> = T.model(
	'style',
	T.object({
		id: T.string,
		type: T.string,
		theme: T.string.optional(),
		variant: T.string.optional(),
		value: T.any.optional(),
	})
)
