import { EditorAtom } from 'tldraw'
import { TldrawAgent } from './TldrawAgent'

/**
 * An atom that contains the agents associated with an editor.
 * More than one agent can be associated with an editor.
 * This starter doesn't take advantage of this, but you could.
 */
export const $agentsAtom = new EditorAtom<TldrawAgent[]>('agents', () => [])
