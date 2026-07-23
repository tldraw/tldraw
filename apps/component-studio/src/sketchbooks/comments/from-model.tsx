import { CommentCard } from '@tldraw/commenting'
import { commentToCardProps, sampleComments } from '../../comment-model'

/**
 * Proof that our UI consumes the data model: CommentCards rendered straight from model
 * Comment records via the commentToCardProps adapter — no bespoke props at the call site.
 */
export function CommentsFromModel() {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 280 }}>
			{sampleComments.map((comment) => (
				<CommentCard key={comment.id} {...commentToCardProps(comment)} />
			))}
		</div>
	)
}
