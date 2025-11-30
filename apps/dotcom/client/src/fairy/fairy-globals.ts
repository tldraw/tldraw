import { AgentModelName, DEFAULT_MODEL_NAME, FairyProject, FairyTask } from '@tldraw/fairy-shared'
import { atom, EditorAtom } from 'tldraw'
import { FairyAgent } from './fairy-agent/FairyAgent'

export const $fairyIsApplyingAction = atom<boolean>('globalIsActing', false)

export const $fairyDebugFlags = atom<{ showTaskBounds: boolean }>('fairyDebugFlags', {
	showTaskBounds: false,
})

export const $fairyModelSelection = atom<AgentModelName>('fairyModelSelection', DEFAULT_MODEL_NAME)

export const $fairyProjects = atom<FairyProject[]>('fairyProjects', [])

export const $fairyTasks = atom<FairyTask[]>('fairyTasks', [])

/**
 * Atom to track which fairy is currently being followed by the camera.
 * Maps from Editor instance to the fairy ID being followed, or null if not following any fairy.
 */
export const $followingFairyId = new EditorAtom<string | null>('followingFairyId', () => null)

export const $fairyAgentsAtom = new EditorAtom<FairyAgent[]>('agents', () => [])
