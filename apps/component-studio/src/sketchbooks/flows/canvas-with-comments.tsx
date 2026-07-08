import { CommentListItemProps, CommentPin, CommentsList } from '@tldraw/commenting'
import { Tldraw } from 'tldraw'
import { commentToolComponents, commentToolOverrides, commentTools } from '../../comment-tool'
import './canvas-with-comments.css'

const NOW = Date.now()
const HOUR = 3_600_000
const ago = (ms: number) => new Date(NOW - ms).toISOString()

const items: CommentListItemProps[] = [
	{
		id: '1',
		author: 'Ada Lovelace',
		preview: 'Should this button be primary?',
		date: ago(2 * HOUR),
		count: 2,
		selected: true,
	},
	{
		id: '2',
		author: 'Grace Hopper',
		preview: 'Spacing looks off on mobile.',
		date: ago(HOUR),
	},
]

export interface CanvasWithCommentsProps {
	/** When true: no comment pins, and the sidebar shows its empty state. */
	empty: boolean
}

/**
 * An editing context with comments: the real tldraw editor with comment pins overlaid
 * and the comments list. Responsive via container queries — the list docks on wide
 * viewports and collapses on narrow ones. `empty` shows the no-comments state.
 */
export function CanvasWithComments({ empty }: CanvasWithCommentsProps) {
	return (
		<div className="scene">
			<div className="scene__main">
				<div className="scene__canvas">
					<Tldraw
						tools={commentTools}
						overrides={commentToolOverrides}
						components={commentToolComponents}
					/>
					{!empty && (
						<div className="scene__pins">
							<div className="scene__pin" style={{ top: '24%', left: '30%' }}>
								<CommentPin resolved={false}>1</CommentPin>
							</div>
							<div className="scene__pin" style={{ top: '58%', left: '60%' }}>
								<CommentPin resolved={false}>2</CommentPin>
							</div>
						</div>
					)}
				</div>
				<div className="scene__sidebar">
					<CommentsList
						items={empty ? [] : items}
						header="Comments"
						empty="No comments yet. Start the conversation."
					/>
				</div>
			</div>
		</div>
	)
}
