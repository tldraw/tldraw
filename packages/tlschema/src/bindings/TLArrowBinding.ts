import { T } from '@tldraw/validate'
import { VecModel, vecModelValidator } from '../misc/geometry-types'
import {
	createBindingPropsMigrationIds,
	createBindingPropsMigrationSequence,
} from '../records/TLBinding'
import { RecordProps } from '../recordsWithProps'
import { arrowShapeVersions } from '../shapes/TLArrowShape'
import { TLBaseBinding } from './TLBaseBinding'

/** @public */
export const ElbowArrowSide = T.literalEnum('top', 'bottom', 'left', 'right')
/** @public */
export type ElbowArrowSide = T.TypeOf<typeof ElbowArrowSide>

/** @public */
export const ElbowArrowSnap = T.literalEnum('center', 'point', 'axis', 'edge')
/** @public */
export type ElbowArrowSnap = T.TypeOf<typeof ElbowArrowSnap>

/** @public */
export interface TLArrowBindingProps {
	terminal: 'start' | 'end'
	normalizedAnchor: VecModel
	/**
	 * exact is whether the arrow head 'enters' the bound shape to point directly at the binding
	 * anchor point
	 */
	isExact: boolean
	/**
	 * precise is whether to bind to the normalizedAnchor, or to the middle of the shape
	 */
	isPrecise: boolean
	entrySide: ElbowArrowSide | null
	snap: ElbowArrowSnap | null
}

/** @public */
export const arrowBindingProps: RecordProps<TLArrowBinding> = {
	terminal: T.literalEnum('start', 'end'),
	normalizedAnchor: vecModelValidator,
	isExact: T.boolean,
	isPrecise: T.boolean,
	entrySide: ElbowArrowSide.nullable(),
	snap: ElbowArrowSnap.nullable(),
}

/** @public */
export type TLArrowBinding = TLBaseBinding<'arrow', TLArrowBindingProps>

/** @public */
export const arrowBindingVersions = createBindingPropsMigrationIds('arrow', {
	AddSide: 1,
})

/** @public */
export const arrowBindingMigrations = createBindingPropsMigrationSequence({
	sequence: [
		{ dependsOn: [arrowShapeVersions.ExtractBindings] },
		{
			id: arrowBindingVersions.AddSide,
			up: (props) => {
				props.entrySide = null
				props.snap = null
			},
			down: (props) => {
				delete props.entrySide
				delete props.snap
			},
		},
	],
})
