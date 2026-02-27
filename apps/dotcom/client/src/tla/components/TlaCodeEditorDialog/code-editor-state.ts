import { atom } from 'tldraw'

export const isCodeEditorOpenAtom = atom('code-editor-open', false)
export const devInspectorPositionAtom = atom<{ x: number; y: number } | null>(
	'dev-inspector-position',
	null
)
