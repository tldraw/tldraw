import {
	CanvasComments,
	CommentAuthor,
	CommentTool,
	commentToolOverrides,
	isAllowedReactionEmoji,
} from '@tldraw/commenting'
import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useMemo } from 'react'
import { commentSchemaRecords, createTLSchema, createTLStore, TLComponents, Tldraw } from 'tldraw'
import {
	DrawingReactionContent,
	DrawingReactionPalette,
	DrawingReactionPaletteProps,
	isDrawingReactionToken,
} from './drawing-reactions'
import '@tldraw/commenting/commenting.css'
import 'tldraw/tldraw.css'

const AUTHORS: Record<string, CommentAuthor> = {
	me: { name: 'You', color: '#EC5E41' },
	ada: { name: 'Ada Lovelace', color: '#0E9F6E' },
}
const resolveAuthor = (id: string): CommentAuthor => AUTHORS[id] ?? { name: id }

// [1]
function ReactionPalette(props: DrawingReactionPaletteProps) {
	return <DrawingReactionPalette {...props} licenseKey={getLicenseKey()} />
}

// [2]
const COMMENT_TOOLS = [
	CommentTool.configure({
		components: {
			ReactionPalette,
			ReactionContent: DrawingReactionContent,
		},
		isAllowedReaction: (token) => isDrawingReactionToken(token) || isAllowedReactionEmoji(token),
	}),
]

export default function CommentDrawingReactionsExample() {
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)

	const components = useMemo<TLComponents>(
		() => ({
			InFrontOfTheCanvas: () => <CanvasComments currentUserId="me" resolveAuthor={resolveAuthor} />,
		}),
		[]
	)

	return (
		<div className="tldraw__editor">
			<Tldraw
				licenseKey={getLicenseKey()}
				store={store}
				tools={COMMENT_TOOLS}
				overrides={[commentToolOverrides]}
				components={components}
			/>
		</div>
	)
}

/*
This example replaces the emoji reaction picker with one you draw in.

A reaction's `emoji` field is a free-form string. The commenting layer stores it, syncs it, and
hands it back to a renderer — it never assumes the string is an emoji glyph. So a custom reaction
system is a palette that produces tokens and a renderer that draws them, which is what
`drawing-reactions.tsx` in this folder implements: the palette is a small locked-down tldraw canvas,
and a token is a `data:` image URL of what you drew.

[1]
`DrawingReactionPalette` renders a nested `<Tldraw>`, which is a second editor and wants its own
license key. Wrapping it here binds the key once so the component slot stays a plain
`ComponentType<EmojiPickerProps>`.

[2]
The three pieces are configured together on the comment tool, and they have to agree: the palette
emits tokens, `ReactionContent` draws them, and `isAllowedReaction` lets them through. Emoji stay
allowed alongside drawings, so reactions posted before the swap still render and toggle.

One caveat if you ship something like this: a drawn token is stored in full on the reaction record
and replicated to every client on the file. The palette caps token length, but the server-side
reaction validation wants a matching cap, or a small SVG becomes an upload channel.
*/
