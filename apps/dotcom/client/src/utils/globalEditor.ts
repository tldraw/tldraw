import { atom, Editor } from 'tldraw'

export const globalEditor = atom<Editor | null>('globalEditor', null)
