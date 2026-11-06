import {
	BaseBoxShapeUtil,
	Editor,
	HTMLContainer,
	RecordPolicy,
	RecordProps,
	T,
	TLShape,
	createShapeId,
	isOwnedBy,
	toRichText,
	useValue,
} from 'tldraw'
import { Scenario, ownsShape } from './scenario'

const STICKER = 'policy-sticker'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[STICKER]: { w: number; h: number; emoji: string }
	}
}

type StickerShape = TLShape<typeof STICKER>

// A plugin shape brings its own rules on its ShapeUtil. They apply to sticker shapes only, below
// any rules that the host adds. Here they widen the default: `stickers:place` is enough to add
// stickers in your own name, on the page, and to change or remove your own.
class StickerShapeUtil extends BaseBoxShapeUtil<StickerShape> {
	static override type = STICKER
	static override props: RecordProps<StickerShape> = { w: T.number, h: T.number, emoji: T.string }
	static override policy: RecordPolicy<StickerShape> = {
		create: (ctx) =>
			ctx.base() ||
			(ctx.can('stickers:place') &&
				ownsShape(ctx, ctx.next) &&
				ctx.next.parentId.startsWith('page:')),
		update: (ctx) =>
			ctx.base() ||
			(ctx.can('stickers:place') &&
				ownsShape(ctx, ctx.prev) &&
				ctx.next.meta.ownerId === ctx.prev.meta.ownerId &&
				ctx.next.parentId === ctx.prev.parentId),
		delete: (ctx) => ctx.base() || (ctx.can('stickers:place') && ownsShape(ctx, ctx.prev)),
	}

	getDefaultProps(): StickerShape['props'] {
		return { w: 64, h: 64, emoji: '⭐' }
	}

	component(shape: StickerShape) {
		return <HTMLContainer className="record-policies__sticker">{shape.props.emoji}</HTMLContainer>
	}

	getIndicatorPath(shape: StickerShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

// A plugin record type brings its rules on its record config. One vote per person, cast and
// changed in their own name only.
interface Vote {
	id: string
	typeName: 'vote'
	userId: string
	choice: 'yes' | 'no'
}

const votePolicy: RecordPolicy<any> = {
	create: ({ can, actor, next }) => can('votes:cast') && next.id === `vote:${actor.id}`,
	update: ({ actor, prev, next }) => isOwnedBy(actor, prev.userId) && next.userId === prev.userId,
	delete: ({ actor, prev }) => isOwnedBy(actor, prev.userId),
}

export const plugins: Scenario = {
	id: 'plugins',
	title: 'Plugin types',
	rules:
		'A sticker shape and a vote record bring their own rules. Stickers: `stickers:place` adds and moves your own stickers, without canvas edit access. Votes: one per person, in your own name.',
	tryThis:
		'Add a sticker as Sam and drag it. Try to drag the owner’s sticker. Vote as each person, then try “Add sticker” as Ann, who may only vote.',
	people: [
		{
			id: 'owner',
			name: 'Owner',
			role: 'editor',
			actions: ['document:write', 'stickers:place', 'votes:cast'],
		},
		{ id: 'sam', name: 'Sam', role: 'sticker guest', actions: ['stickers:place', 'votes:cast'] },
		{ id: 'ann', name: 'Ann', role: 'voter', actions: ['votes:cast'] },
	],
	policies: {},
	shapeUtils: [StickerShapeUtil],
	records: {
		vote: {
			scope: 'document',
			validator: T.object({
				id: T.string,
				typeName: T.literal('vote'),
				userId: T.string,
				choice: T.literalEnum('yes', 'no'),
			}),
			policy: votePolicy,
		},
	},
	seed(editor, person) {
		if (person.id !== 'owner' || editor.getCurrentPageShapeIds().size > 0) return
		editor.createShapes([
			{
				type: 'note',
				x: 0,
				y: 0,
				props: { richText: toRichText('Should we ship it? Vote above.') },
			},
		])
		addSticker(editor, person.id, '🚀', 240, 40)
	},
	Controls({ editor, person }) {
		const votes = useValue(
			'votes',
			() =>
				editor.store.allRecords().filter((r) => r.typeName === ('vote' as any)) as any as Vote[],
			[editor]
		)
		const vote = (choice: Vote['choice']) =>
			editor.store.put([
				{ id: `vote:${person.id}`, typeName: 'vote', userId: person.id, choice } as any,
			])
		const count = (choice: Vote['choice']) => votes.filter((v) => v.choice === choice).length
		return (
			<>
				<button onClick={() => vote('yes')}>Yes ({count('yes')})</button>
				<button onClick={() => vote('no')}>No ({count('no')})</button>
				<button
					onClick={() =>
						addSticker(
							editor,
							person.id,
							'⭐',
							100 + Math.random() * 300,
							160 + Math.random() * 100
						)
					}
				>
					Add sticker
				</button>
			</>
		)
	},
}

function addSticker(editor: Editor, ownerId: string, emoji: string, x: number, y: number) {
	editor.createShape({
		id: createShapeId(),
		type: STICKER,
		x,
		y,
		props: { emoji },
		meta: { ownerId },
	})
}
