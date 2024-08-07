import { createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { DefaultColorStyle, TLDefaultColorStyle } from '../styles/TLColorStyle'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export interface TLTimerShapeProps {
	color: TLDefaultColorStyle
}

/** @public */
export type TLTimerShape = TLBaseShape<'timer', TLTimerShapeProps>

/** @public */
export const timerShapeProps: RecordProps<TLTimerShape> = {
	color: DefaultColorStyle,
}

/** @public */
export const timerShapeMigrations = createShapePropsMigrationSequence({
	sequence: [],
})
