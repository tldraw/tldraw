import { AgentModelName, DEFAULT_MODEL_NAME } from '@tldraw/fairy-shared'
import { atom } from 'tldraw'

export const $fairyModelSelection = atom<AgentModelName>('fairyModelSelection', DEFAULT_MODEL_NAME)
