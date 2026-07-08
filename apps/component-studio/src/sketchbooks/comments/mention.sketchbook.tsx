import { Mention, MentionProps } from '@tldraw/comments'
import { Sketch, Sketchbook } from '../../sketch'

const sketchbook: Sketchbook<MentionProps> = {
	title: 'Comments/Mention',
	component: Mention,
}
export default sketchbook

export const Person: Sketch<MentionProps> = { args: { name: 'Ada Lovelace' } }
