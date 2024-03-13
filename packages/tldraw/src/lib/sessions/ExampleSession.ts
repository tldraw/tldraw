import { Session } from '@tldraw/editor'

export class ExampleSession extends Session<{
	handleId: string
}> {
	protected override onStart(): void {
		this.info.handleId
	}
	protected override onUpdate(): void {}

	protected override onInterrupt(): void {}

	protected override onCancel(): void {}

	protected override onComplete(): void {}

	protected override onEnd(): void {}
}

const session = new ExampleSession(editor, {
	handleId,
	onBeforeUpdate(event) {},
	onUpdate() {},
})
