import { T } from '@tldraw/validate'

export type TLinstanceState = {
	canMoveCamera: boolean
	isFocused: boolean
	devicePixelRatio: number
	isCoarsePointer: boolean
	openMenus: string[]
	isChangingStyle: boolean
	isReadOnly: boolean
}

export const instanceStateValidator = T.object<TLinstanceState>({
	canMoveCamera: T.boolean,
	isFocused: T.boolean,
	devicePixelRatio: T.number,
	isCoarsePointer: T.boolean,
	openMenus: T.arrayOf(T.string),
	isChangingStyle: T.boolean,
	isReadOnly: T.boolean,
})
