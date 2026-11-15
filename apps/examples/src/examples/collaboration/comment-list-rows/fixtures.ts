import { CommentAuthor, ReactionSummary } from '@tldraw/commenting'

const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR
export function ago(ms: number) {
	return new Date(Date.now() - ms).toISOString()
}

export const steve: CommentAuthor = { name: 'Steve Ruiz', color: '#E05A8A' }
export const ada: CommentAuthor = { name: 'Ada Lovelace', color: '#4465E9' }
export const grace: CommentAuthor = { name: 'Grace Hopper', color: '#E0782F' }
export const longName: CommentAuthor = {
	name: 'Wolfeschlegelsteinhausenbergerdorff Hubert Blaine',
	color: '#9D50FF',
}

export const SHORT = 'ok'
export const ONE_LINE = 'Is this the final position?'
export const TWO_LINES =
	'The ellipse reads better than the rectangle did, so let’s keep it that way.'
export const MANY_LINES =
	'A few thoughts on this before we share it more widely: the header feels heavy, the spacing between the cards is uneven, and the call to action gets lost below the fold. Could we try a version with the summary first?'
export const LONG_URL =
	'https://www.example.com/a/very/long/path/that/never/breaks/' + 'x'.repeat(80)
export const MASHED = 'aasdsaasdsadsadsaasdsadas'.repeat(6)
export const RTL = 'مرحبا، هل هذا هو الموضع النهائي لهذا المربع؟'

const reactors = [{ name: 'Ada Lovelace', you: false }]
export function reaction(emoji: string, count: number, active = false): ReactionSummary {
	return { emoji, count, active, reactors }
}
export const ONE_REACTION = [reaction('👍', 1)]
export const THREE_REACTIONS = [reaction('👍', 1), reaction('❤️', 1), reaction('🎉', 1)]
export const MANY_REACTIONS = [
	reaction('👍', 128),
	reaction('❤️', 99, true),
	reaction('🎉', 1024),
	reaction('😂', 7),
	reaction('😮', 1),
	reaction('😢', 2),
	reaction('🙏', 31),
	reaction('🔥', 5),
]
