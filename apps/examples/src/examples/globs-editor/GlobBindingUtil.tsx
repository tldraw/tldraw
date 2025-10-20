import { BindingOnShapeChangeOptions, BindingUtil, TLBaseBinding } from 'tldraw'

export type GlobBinding = TLBaseBinding<'glob', GlobBindingProps>

interface GlobBindingProps {
	terminal: 'start' | 'end'
}
export class GlobBindingUtil extends BindingUtil<GlobBinding> {
	static override type = 'glob' as const

	override getDefaultProps(): Partial<GlobBindingProps> {
		return {
			terminal: 'start',
		}
	}

	override onAfterChangeToShape({ binding }: BindingOnShapeChangeOptions<GlobBinding>): void {
		// console.log('onAfterChangeToShape', binding)
	}
}
