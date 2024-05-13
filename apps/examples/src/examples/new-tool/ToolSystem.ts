import { Editor, TLToolContext, ToolUtil } from 'tldraw'

export class ToolSystem<T extends TLToolContext, Q extends object> {
	constructor(
		public editor: Editor,
		public tool: ToolUtil<T, Q>
	) {}
}
