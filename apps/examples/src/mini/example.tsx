import { EditorExtension } from './EditorExtension'
import { EditorProvider, useEditor } from './editor-react'

const MyAnimalExtension = EditorExtension.create({
	name: 'animal',
	addOptions() {
		return {
			kind: 'dog',
		}
	},
	addStorage() {
		return {
			age: 32,
		}
	},
})

function Example() {
	const editor = useEditor({
		extensions: [MyAnimalExtension],
	})

	if (editor) {
		const storage = editor?.storage
		type C = typeof storage extends any ? never : 'k'

		const test: C = 1
	}

	return <EditorProvider editor={editor}></EditorProvider>
}
