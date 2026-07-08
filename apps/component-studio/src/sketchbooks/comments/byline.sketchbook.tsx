import { Byline, BylineProps } from '@tldraw/comments'
import { Sketch, Sketchbook } from '../../sketch'

const NOW = Date.now()
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const ago = (ms: number) => new Date(NOW - ms).toISOString()

const sketchbook: Sketchbook<BylineProps> = {
	title: 'Comments/Byline',
	component: Byline,
	// `date` is an ISO string, so the type infers a text control; override to a date picker.
	argTypes: { date: { control: 'date' } },
}
export default sketchbook

export const JustNow: Sketch<BylineProps> = { args: { author: 'Ada Lovelace', date: ago(15_000) } }
export const MinutesAgo: Sketch<BylineProps> = {
	args: { author: 'Ada Lovelace', date: ago(8 * MIN) },
}
export const HourAgo: Sketch<BylineProps> = { args: { author: 'Ada Lovelace', date: ago(HOUR) } }
export const Yesterday: Sketch<BylineProps> = {
	args: { author: 'Ada Lovelace', date: ago(DAY + 2 * HOUR) },
}
export const LastWeek: Sketch<BylineProps> = { args: { author: 'Ada Lovelace', date: ago(WEEK) } }
