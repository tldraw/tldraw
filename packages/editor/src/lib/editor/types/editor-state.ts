import { T } from '@tldraw/validate'

export type TLEditorState = {
	canMoveCamera: boolean
	isFocused: boolean
	devicePixelRatio: number
	isCoarsePointer: boolean
	openMenus: string[]
	isChangingStyle: boolean
	isReadOnly: boolean
}

export const editorStateValidator = T.object<TLEditorState>({
	canMoveCamera: T.boolean,
	isFocused: T.boolean,
	devicePixelRatio: T.number,
	isCoarsePointer: T.boolean,
	openMenus: T.arrayOf(T.string),
	isChangingStyle: T.boolean,
	isReadOnly: T.boolean,
})
