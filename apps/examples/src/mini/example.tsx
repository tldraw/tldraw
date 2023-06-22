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

const MyPersonExtension = EditorExtension.create({
	name: 'person' as const,
	addOptions() {
		return {
			email: 'person@aol.com',
		}
	},
	addStorage() {
		return {
			clicks: 0,
		}
	},
})

function Example() {
	const editor = useEditor({
		extensions: [MyAnimalExtension, MyPersonExtension],
	})

	if (editor) {
		const storage = editor?.storage
		storage.animal
		storage.person
		storage.rat

		const t = editor.getStorage('person')
	}

	return <EditorProvider editor={editor}></EditorProvider>
}
