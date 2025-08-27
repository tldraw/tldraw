import { atom, BoxModel } from 'tldraw'

export const $agentViewportBoundsHighlight = atom<BoxModel | null>('contextBoundsHighlight', null)
