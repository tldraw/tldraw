import { Editor } from 'tldraw'
import { $fairyAgentsAtom } from '../fairy-globals'

/**
 * An atom containing all the agents attached to an editor.
 *
 * More than one agent can be attached to a single editor.
 * This starter doesn't take advantage of that, but you could.
 */
export function getFairyAgents(editor: Editor) {
	return $fairyAgentsAtom.get(editor)
}

export function getFairyAgentById(id: string, editor: Editor) {
	return $fairyAgentsAtom.get(editor).find((agent) => agent.id === id)
}

export function getFairyNameById(id: string, editor: Editor) {
	return $fairyAgentsAtom
		.get(editor)
		.find((agent) => agent.id === id)
		?.$fairyConfig.get().name
}
