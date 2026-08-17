import {
	CanvasComments,
	CommentAuthor,
	CommentTool,
	commentToolOverrides,
	isAllowedReactionEmoji,
} from '@tldraw/commenting'
import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useCallback, useMemo } from 'react'
import {
	commentSchemaRecords,
	createTLSchema,
	createTLStore,
	TLComponents,
	Tldraw,
	useEditor,
} from 'tldraw'
import {
	DrawingReactionContent,
	DrawingReactionPalette,
	DrawingReactionPaletteProps,
	isDrawingReactionToken,
	reactionDrawingRecords,
	saveDrawingReaction,
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
	const editor = useEditor()
	const saveDrawing = useCallback((src: string) => saveDrawingReaction(editor, src), [editor])
	return (
		<DrawingReactionPalette {...props} licenseKey={getLicenseKey()} saveDrawing={saveDrawing} />
	)
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
		() =>
			createTLStore({
				// [3]
				schema: createTLSchema({
					records: { ...commentSchemaRecords, ...reactionDrawingRecords },
				}),
			}),
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
A reaction token is a free-form string, capped at 64 characters because it is embedded in the
reaction's record id. So a custom reaction can be anything, as long as the token *names* the content
rather than contains it. `drawing-reactions.tsx` implements that recipe: a `reaction-drawing` record
holds the image, the palette saves one and emits its id, and the renderer resolves the id back to
the image. The same shape works for stickers or sounds — for heavyweight content, have the record
hold an uploaded asset's URL instead of inline bytes, since document records replicate to every
client on the file.

[1]
`DrawingReactionPalette` renders a nested `<Tldraw>`, which is a second editor and wants its own
license key. The wrapper also binds `saveDrawing` to the host editor (this component renders in
the host's UI, so `useEditor` is the host), which is how a submitted drawing lands in the host
document rather than the palette's scratch canvas.

[2]
The pieces are configured together on the comment tool, and they have to agree: the palette emits
record-id tokens, `ReactionContent` resolves and draws them, and `isAllowedReaction` lets them
through. Emoji stay allowed alongside drawings, so both kinds coexist on the same comment.
`isAllowedReaction` can only check a token's shape — a token is a claim, not proof the record
exists — so the renderer treats a missing record as "render nothing".

[3]
The drawing record type registers next to the commenting records. With multiplayer sync, register
it on the server's schema too, or validation fails on connect. The record's own validator enforces
the data:image allowlist and a size cap, so those limits hold against any writer, not just this
palette. Drawings are never garbage-collected here; a real app might sweep records no reaction
references.
*/
