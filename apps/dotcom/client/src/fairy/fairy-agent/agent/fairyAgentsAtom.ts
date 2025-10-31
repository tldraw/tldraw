import { Editor, EditorAtom } from 'tldraw'
import { FairyAgent } from './FairyAgent'

/**
 * An atom containing all the agents attached to an editor.
 *
 * More than one agent can be attached to a single editor.
 * This starter doesn't take advantage of that, but you could.
 */
export const $fairyAgentsAtom = new EditorAtom<FairyAgent[]>('agents', () => [])

export function getFairyAgentById(id: string, editor: Editor) {
	return $fairyAgentsAtom.get(editor).find((agent) => agent.id === id)
}

export function getFairyNameById(id: string, editor: Editor) {
	return $fairyAgentsAtom
		.get(editor)
		.find((agent) => agent.id === id)
		?.$fairyConfig.get().name
}
