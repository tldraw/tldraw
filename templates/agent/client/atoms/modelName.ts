import { atom } from 'tldraw'
import { AgentModelName, DEFAULT_MODEL_NAME } from '../../worker/models'
import { persistAtomInLocalStorage } from './persistAtomInLocalStorage'

/**
 * An atom containing the model name that the user has selected within the chat input.
 * This is a global setting and not tied to any specific agent or editor.
 */
export const $modelName = atom<AgentModelName>('modelName', DEFAULT_MODEL_NAME)

persistAtomInLocalStorage($modelName, 'model-name')
