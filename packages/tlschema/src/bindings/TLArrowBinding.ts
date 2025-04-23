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
export const ElbowArrowSnap = T.literalEnum('center', 'edge-point', 'edge', 'none')
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
	snap: ElbowArrowSnap
}

/** @public */
export const arrowBindingProps: RecordProps<TLArrowBinding> = {
	terminal: T.literalEnum('start', 'end'),
	normalizedAnchor: vecModelValidator,
	isExact: T.boolean,
	isPrecise: T.boolean,
	snap: ElbowArrowSnap,
}

/** @public */
export type TLArrowBinding = TLBaseBinding<'arrow', TLArrowBindingProps>

/** @public */
export const arrowBindingVersions = createBindingPropsMigrationIds('arrow', {
	AddSnap: 1,
})

/** @public */
export const arrowBindingMigrations = createBindingPropsMigrationSequence({
	sequence: [
		{ dependsOn: [arrowShapeVersions.ExtractBindings] },
		{
			id: arrowBindingVersions.AddSnap,
			up: (props) => {
				props.snap = 'none'
			},
			down: (props) => {
				delete props.snap
			},
		},
	],
})
