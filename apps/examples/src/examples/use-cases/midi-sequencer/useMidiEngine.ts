import { useEditor } from 'tldraw'
import { MidiEngine } from './engine/MidiEngine'

// Convenience hook: one MidiEngine instance per editor.
export function useMidiEngine() {
	const editor = useEditor()
	return MidiEngine.get(editor)
}
