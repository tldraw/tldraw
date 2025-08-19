import { atom } from 'tldraw'
import { AgentModelName, DEFAULT_MODEL_NAME } from '../../worker/models'
import { persistAtomInLocalStorage } from './persistAtomInLocalStorage'

export const $modelName = atom<AgentModelName>('modelName', DEFAULT_MODEL_NAME)

persistAtomInLocalStorage($modelName, 'model-name')
