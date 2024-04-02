import {
	BindingUtil,
	TLArrowBindingProps,
	arrowBindingMigrations,
	arrowBindingProps,
} from '@tldraw/editor'

export class ArrowBindingUtil extends BindingUtil {
	static override type = 'arrow'

	static override props = arrowBindingProps
	static override migrations = arrowBindingMigrations

	override getDefaultProps(): Partial<TLArrowBindingProps> {
		return {
			isPrecise: false,
			isExact: false,
			normalizedAnchor: { x: 0.5, y: 0.5 },
		}
	}
}
