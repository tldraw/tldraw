import { Editor } from 'tldraw'

export function TlaEditorErrorFallback({ error }: { error: unknown; editor?: Editor }) {
	throw error
	return null
}
