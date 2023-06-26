import { EditorExtension } from '../EditorExtension'
import { EditorStateRecord, editorStateRecordType } from '../editor-schema'

const editorStateExtension = EditorExtension.create({
	name: 'editor-state',
	addRecords() {
		return [editorStateRecordType]
	},
	addCommands(editor, createCommand) {
		return createCommand(
			'update-editor-state',
			(editorState: EditorStateRecord) => {
				const prev = editor.store.get(editorState.id) ?? editorState
				return { data: { next: editorState, prev } }
			},
			{
				do({ next }) {
					editor.store.put([next])
				},
				undo({ prev }) {
					editor.store.put([prev])
				},
			}
		)
	},
})
