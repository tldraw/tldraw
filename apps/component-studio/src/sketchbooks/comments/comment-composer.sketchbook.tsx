import {
	CommentComposer,
	CommentComposerProps,
	filterMentionMembers,
	MentionMember,
} from '@tldraw/commenting'
import { useState } from 'react'
import { TLRichText, toRichText } from 'tldraw'
import { Sketch, Sketchbook } from '../../sketch'

const sketchbook: Sketchbook<CommentComposerProps> = {
	title: 'Comments/Composer',
	component: CommentComposer,
}
export default sketchbook

/** Placing a new thread: the composer that opens at the click point. */
export const Placement: Sketch<CommentComposerProps> = {
	args: { author: 'You', placeholder: 'Add a comment…' },
}

/** Replying inside an open thread. */
export const Reply: Sketch<CommentComposerProps> = {
	args: { author: 'You', placeholder: 'Reply…' },
}

const members: MentionMember[] = [
	{ id: 'u1', name: 'Ada Lovelace', color: '#6c5ce7', you: true },
	{ id: 'u2', name: 'Alan Turing', color: '#00b894' },
	{ id: 'u3', name: 'Grace Hopper', color: '#e17055' },
	{ id: 'u4', name: 'Katherine Johnson', color: '#0984e3' },
]

function MentionDemo() {
	const [value, setValue] = useState<TLRichText>(() => toRichText(''))
	return (
		<CommentComposer
			author="You"
			placeholder="Add a comment… type @ to mention"
			value={value}
			onChange={setValue}
			getMentionSuggestions={(query) => filterMentionMembers(members, query)}
		/>
	)
}

/** Interactive: type `@` to open the member picker; ↑/↓ to navigate, Enter to insert a mention. */
export const WithMentions: Sketch<CommentComposerProps> = {
	render: () => <MentionDemo />,
}
