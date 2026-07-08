import { CommentListItemProps, CommentsList } from '@tldraw/comments'
import { CSSProperties } from 'react'
import { Sketch, Sketchbook } from '../../sketch'

const NOW = Date.now()
const HOUR = 3_600_000
const ago = (ms: number) => new Date(NOW - ms).toISOString()

const items: CommentListItemProps[] = [
	{
		id: '1',
		author: 'Ada Lovelace',
		preview: 'Should this button be primary? See the spec before we ship.',
		date: ago(3 * HOUR),
		count: 3,
		selected: true,
	},
	{
		id: '2',
		author: 'Grace Hopper',
		preview: 'Spacing looks off on mobile — the send button wraps below the fold.',
		date: ago(2 * HOUR),
	},
	{
		id: '3',
		author: 'Jessica Edwards',
		preview: 'Fixed the radius.',
		date: ago(HOUR),
		resolved: true,
		count: 2,
	},
]

const panel: CSSProperties = {
	width: 280,
	background: 'var(--tl-color-panel)',
	borderRadius: 'var(--tl-radius-4)',
	boxShadow: 'var(--tl-shadow-2)',
	overflow: 'hidden',
}

const sketchbook: Sketchbook<Record<string, never>> = {
	title: 'Comments/List',
}
export default sketchbook

export const Default: Sketch<Record<string, never>> = {
	render: () => (
		<div style={panel}>
			<CommentsList items={items} header="Comments" />
		</div>
	),
}

export const Empty: Sketch<Record<string, never>> = {
	render: () => (
		<div style={panel}>
			<CommentsList items={[]} header="Comments" empty="No comments on this page yet." />
		</div>
	),
}
