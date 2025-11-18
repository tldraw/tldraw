import { atom } from 'tldraw'

export const $fairyDebugFlags = atom<{ showTaskBounds: boolean }>('fairyDebugFlags', {
	showTaskBounds: false,
})
