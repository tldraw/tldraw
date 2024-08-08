import { T } from '@tldraw/validate'
import { createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export interface TLTimerShapeProps {
	time: number
	state: string
}

/** @public */
export type TLTimerShape = TLBaseShape<'timer', TLTimerShapeProps>

/** @public */
export const timerShapeProps: RecordProps<TLTimerShape> = {
	time: T.number,
	state: T.string,
}

/** @public */
export const timerShapeMigrations = createShapePropsMigrationSequence({
	sequence: [],
})
