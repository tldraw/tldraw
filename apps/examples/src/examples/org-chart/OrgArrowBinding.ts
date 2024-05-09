import { BindingOnShapeDeleteOptions, BindingUtil, TLBaseBinding } from 'tldraw'

export type OrgArrowBinding = TLBaseBinding<'org-arrow', {}>
export class OrgArrowBindingUtil extends BindingUtil<OrgArrowBinding> {
	static override type = 'org-arrow' as const

	override getDefaultProps() {
		return {}
	}

	override onBeforeDeleteToShape(options: BindingOnShapeDeleteOptions<OrgArrowBinding>): void {
		const arrowId = options.binding.fromId
		this.editor.batch(() => {
			const otherBinding = this.editor
				.getBindingsFromShape(arrowId, 'org-arrow')
				.filter((b) => b.id !== options.binding.id)
			this.editor.updateShape({
				id: arrowId,
				type: 'org-arrow',
				isLocked: false,
			})
			this.editor.deleteShape(arrowId)
			this.editor.deleteBindings(otherBinding)
		})
	}
}
