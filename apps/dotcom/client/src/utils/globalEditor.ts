import { atom, Editor, useValue } from 'tldraw'

export const globalEditor = atom<Editor | null>('globalEditor', null)
export function useGlobalEditor() {
	return useValue(globalEditor)
}
