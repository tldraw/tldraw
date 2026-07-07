import { Sketch, Sketchbook } from '../../sketch'
import { Mention, MentionProps } from './mention'

const sketchbook: Sketchbook<MentionProps> = {
	title: 'Comments/Mention',
	component: Mention,
}
export default sketchbook

export const Person: Sketch<MentionProps> = { args: { name: 'Ada Lovelace' } }
