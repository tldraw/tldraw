import { T } from '@tldraw/validate'

type EditorContext = {
	isDarkMode: boolean
}

interface StylePropOpts<T> {
	defaultValue: T

	getSvgExportDefs?: (
		value: T,
		editor: EditorContext
	) => Promise<SVGElement | SVGElement[] | null> | SVGElement | SVGElement[] | null

	canvasDefsComponent?: React.ComponentType
}

/** @public */
export class StyleProp<Type> implements T.Validatable<Type> {
	static define<Type>(
		uniqueId: string,
		{ type = T.any, ...opts }: { type?: T.Validatable<Type> } & StylePropOpts<Type>
	) {
		return new StyleProp<Type>(uniqueId, type, opts)
	}

	static defineEnum<const Values extends readonly unknown[]>(
		uniqueId: string,
		{ values, ...opts }: { values: Values } & StylePropOpts<Values[number]>
	) {
		return new EnumStyleProp<Values[number]>(uniqueId, values, opts)
	}

	constructor(readonly id: string, readonly type: T.Validatable<Type>, opts: StylePropOpts<Type>) {
		this.defaultValue = opts.defaultValue
		this._getSvgExportDefs = opts.getSvgExportDefs ?? (() => null)
		this.canvasDefsComponent = opts.canvasDefsComponent
	}

	readonly defaultValue: Type

	private readonly _getSvgExportDefs: (
		value: Type,
		editor: EditorContext
	) => Promise<SVGElement | SVGElement[] | null> | SVGElement | SVGElement[] | null
	getSvgExportDefs(
		value: Type,
		editor: EditorContext
	): Promise<SVGElement | SVGElement[] | null> | SVGElement | SVGElement[] | null {
		return this._getSvgExportDefs(value, editor)
	}

	readonly canvasDefsComponent: React.ComponentType | undefined

	validate(value: unknown) {
		return this.type.validate(value)
	}
}

/** @public */
export class EnumStyleProp<T> extends StyleProp<T> {
	/** @internal */
	constructor(id: string, readonly values: readonly T[], opts: StylePropOpts<T>) {
		super(id, T.literalEnum(...values), opts)
	}
}
