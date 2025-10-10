import { EditorAtom } from 'tldraw'
import { TldrawFairyAgent } from './TldrawFairyAgent'

/**
 * An atom containing all the agents attached to an editor.
 *
 * More than one agent can be attached to a single editor.
 * This starter doesn't take advantage of that, but you could.
 */
export const $agentsAtom = new EditorAtom<TldrawFairyAgent[]>('agents', () => [])
