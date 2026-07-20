import {
	createMentionExtension,
	createMentionSuggestion,
	filterMentionMembers,
	MentionMember,
	MentionSuggestionOptions,
} from '@tldraw/mentions'
import { useMemo, useRef } from 'react'
import {
	defaultAddFontsFromNode,
	Editor,
	TLTextOptions,
	Tldraw,
	tipTapDefaultExtensions,
} from 'tldraw'
import '@tldraw/mentions/mentions.css'
import 'tldraw/tldraw.css'

// The people who can be @-mentioned. A real app would pull this from its own roster; the picker
// filters this list as you type after `@`.
const MEMBERS: MentionMember[] = [
	{ id: 'ada', name: 'Ada Lovelace' },
	{ id: 'grace', name: 'Grace Hopper' },
	{ id: 'alan', name: 'Alan Turing' },
	{ id: 'katherine', name: 'Katherine Johnson' },
]

// Resolve a stored mention id to its current display name, so a mention pill always shows the
// member's name (and would follow a rename) rather than a copy frozen at insert time.
const NAMES: Record<string, string> = Object.fromEntries(MEMBERS.map((m) => [m.id, m.name]))
const resolveName = (id: string): string | undefined => NAMES[id]

export default function ShapeMentionsExample() {
	// The suggestion plugin reads `editor` lazily when the picker opens, so we can build the extension
	// before the editor exists and hand the editor in on mount (which lets the popup track the camera).
	const suggestionOptions = useRef<MentionSuggestionOptions>({ editor: null })

	// Add the mention node to tldraw's default rich-text extensions and pass the result as the text
	// options. Providing `extensions` replaces the default set, so spread the defaults back in.
	const textOptions = useMemo<TLTextOptions>(() => {
		const mention = createMentionExtension({
			resolveName,
			suggestion: createMentionSuggestion(
				(query) => filterMentionMembers(MEMBERS, query),
				suggestionOptions.current
			),
		})
		return {
			addFontsFromNode: defaultAddFontsFromNode,
			tipTapConfig: { extensions: [...tipTapDefaultExtensions, mention] },
		}
	}, [])

	return (
		<div className="tldraw__editor">
			<Tldraw
				options={{ text: textOptions }}
				onMount={(editor: Editor) => {
					suggestionOptions.current.editor = editor
				}}
			/>
		</div>
	)
}
