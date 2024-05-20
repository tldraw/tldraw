import { T } from '@tldraw/validate'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordPropsType } from '../recordsWithProps'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export const codeShapeProps = {
	size: DefaultSizeStyle,
	growY: T.positiveNumber,
	text: T.string,
}

/** @public */
export type TLCodeShapeProps = RecordPropsType<typeof codeShapeProps>

/** @public */
export type TLCodeShape = TLBaseShape<'code', TLCodeShapeProps>

const Versions = createShapePropsMigrationIds('code', {})

export { Versions as codeShapeVersions }

/** @public */
export const codeShapeMigrations = createShapePropsMigrationSequence({ sequence: [] })
