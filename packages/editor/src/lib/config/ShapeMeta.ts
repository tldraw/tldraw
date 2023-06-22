import { TLShape } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'

/** @public */
export class ShapeMeta<T> {
	static define<T>(
		id: string,
		{
			type = T.any,
			getDefaultValue,
		}: { type?: T.Validatable<T>; getDefaultValue: (shape: TLShape) => T }
	) {
		return new ShapeMeta<T>(id, type, getDefaultValue)
	}

	private constructor(
		public readonly id: string,
		public readonly type: T.Validatable<T>,
		public readonly getDefaultValue: (shape: TLShape) => T
	) {}
}
