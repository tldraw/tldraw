import { RecordProps, T, TLShape, vecModelValidator } from 'tldraw'

// [1]
const CORAL_TYPE = 'coral' as const

declare module 'tldraw' {
	interface TLGlobalShapePropsMap {
		[CORAL_TYPE]: {
			basePath: { x: number; y: number }[]
			pullVector: { x: number; y: number }
		}
	}
}

export { CORAL_TYPE }
export type CoralShape = TLShape<typeof CORAL_TYPE>

// [2]
export const coralShapeProps: RecordProps<CoralShape> = {
	basePath: T.arrayOf(vecModelValidator),
	pullVector: vecModelValidator,
}

/*
[1]
We extend tldraw's global shape props map so the editor knows about our custom shape type.

[2]
Validators ensure shapes loaded from persistence have the correct structure.
*/
