import { Editor } from './Editor'
import { EditorExtension } from './EditorExtension'
import { EditorProvider, useEditor, useEditorContext } from './editor-react'

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

const MyExtensions = [MyAnimalExtension, MyPersonExtension] as const

type MyEditorType = Editor<typeof MyExtensions>

export function Example() {
	const editor = useEditor({
		extensions: [MyAnimalExtension, MyPersonExtension],
	})

	if (editor) {
		// Works!
		const compatibilityTest: MyEditorType = editor
		compatibilityTest

		editor.extensions.extensions.animal

		const storage = editor?.storage
		storage.animal
		storage.person.clicks
		// @ts-expect-error person does not have tweets property
		storage.person.tweets
		// @ts-expect-error rat does not exist in storage
		storage.rat

		const person = editor.getExtension('person')
		person.storage.clicks
		// @ts-expect-error
		person.storage.tweets

		// @ts-expect-error
		const rat = editor.getExtension('rat')
		// @ts-expect-error
		rat.storage.beeps
	}

	return (
		<EditorProvider editor={editor}>
			<InsideEditor />
		</EditorProvider>
	)
}

function InsideEditor() {
	const editor = useEditorContext<MyEditorType>()

	return <div>{editor.storage.person.clicks}</div>
}
