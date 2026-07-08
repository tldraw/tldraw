import { Reaction } from './reaction'

/**
 * The row of reactions under a comment, plus an add-reaction button.
 * @public
 * @react
 */
export function Reactions() {
	return (
		<div className="cmt-reactions">
			<Reaction emoji="👍" count={3} active={true} />
			<Reaction emoji="🎉" count={1} active={false} />
			<Reaction emoji="👀" count={2} active={false} />
			<button className="cmt-reaction cmt-reaction--add" type="button" aria-label="Add reaction">
				＋
			</button>
		</div>
	)
}
