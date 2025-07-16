import { useMemo } from 'react'
import { useEditor } from 'tldraw'
import { TldrawAiModule, TldrawAiModuleOptions } from './TldrawAiModule'
import { TLAiPrompt, TLAiStreamingChange } from './types'

/** @public */
export function useTldrawAiModule<Prompt = TLAiPrompt, Change = TLAiStreamingChange>(
	options: TldrawAiModuleOptions<Prompt, Change>
) {
	const editor = useEditor()
	const ai = useMemo(() => new TldrawAiModule(editor, options), [editor, options])
	return ai
}
