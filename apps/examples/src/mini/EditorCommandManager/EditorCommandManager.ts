import { Editor } from '../Editor'
import { EditorExtension } from '../EditorExtension'

export class EditorCommandManager<E extends readonly EditorExtension[]> {
	constructor(private readonly editor: Editor<E>) {}
}
