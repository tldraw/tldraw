/* eslint-disable tldraw/jsx-no-literals */
import { CommentThread, Mention, MentionProps } from '@tldraw/commenting'
import { Sketch, Sketchbook } from '../../sketch'

const NOW = Date.now()
const HOUR = 3_600_000
const ago = (ms: number) => new Date(NOW - ms).toISOString()

const sketchbook: Sketchbook<MentionProps> = {
	title: 'Comments/Mention',
	component: Mention,
}
export default sketchbook

/** The mention pill on its own. */
export const Person: Sketch<MentionProps> = { args: { name: 'Ada Lovelace' } }

/** Mentions inside real comment bodies — pills sit inline with the surrounding prose. */
export const InThread: Sketch<MentionProps> = {
	render: () => (
		<CommentThread
			header="Thread"
			comments={[
				{
					author: { name: 'Grace Hopper' },
					body: (
						<span>
							Hey <Mention name="Ada Lovelace" />, can you take a look at this bug?
						</span>
					),
					date: ago(2 * HOUR),
					you: false,
				},
				{
					author: { name: 'You' },
					body: (
						<span>
							On it — looping in <Mention name="Alan Turing" /> too.
						</span>
					),
					date: ago(HOUR),
					you: true,
				},
			]}
			composer={{ author: { name: 'You' }, placeholder: 'Reply…' }}
		/>
	),
}
