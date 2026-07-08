/** @public */
export interface MentionProps {
	name: string
}

/**
 * An \@-mention pill for referencing a person in a comment.
 * @public
 * @react
 */
export function Mention({ name }: MentionProps) {
	return <span className="cmt-mention">@{name}</span>
}
