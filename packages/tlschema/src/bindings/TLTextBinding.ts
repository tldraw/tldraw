import { T } from '@tldraw/validate'
import { createBindingPropsMigrationSequence } from '../records/TLBinding'
import { RecordProps } from '../recordsWithProps'
import { TLBaseBinding } from './TLBaseBinding'

/** @public */
export type TLTextBindingProps = {
	y:
		| {
				type: 'offset'
				edge: 'top' | 'bottom'
				offsetInToShapeSpace: number
		  }
		| { type: 'center' }
	x:
		| {
				type: 'offset'
				edge: 'left' | 'right'
				offsetInToShapeSpace: number
		  }
		| { type: 'center' }
}

/** @public */
export const textBindingProps: RecordProps<TLTextBinding> = {
	y: T.union('type', {
		offset: T.object({
			type: T.literal('offset'),
			edge: T.literalEnum('top', 'bottom'),
			offsetInToShapeSpace: T.number,
		}),
		center: T.object({ type: T.literal('center') }),
	}),

	x: T.union('type', {
		offset: T.object({
			type: T.literal('offset'),
			edge: T.literalEnum('left', 'right'),
			offsetInToShapeSpace: T.number,
		}),
		center: T.object({ type: T.literal('center') }),
	}),
}

/** @public */
export type TLTextBinding = TLBaseBinding<'text', TLTextBindingProps>

export const textBindingVersions = {} as const

/** @public */
export const textBindingMigrations = createBindingPropsMigrationSequence({
	sequence: [],
})
