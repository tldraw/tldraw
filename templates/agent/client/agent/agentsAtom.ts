import { atom } from 'tldraw'
import { TldrawAgent } from './TldrawAgent'

/**
 * An atom containing all agents.
 *
 * This starter only uses one agent, but you could extend it to support multiple.
 */
export const $agentsAtom = atom<TldrawAgent[]>('agents', [])
