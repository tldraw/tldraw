import './comments.css'

export interface MentionProps {
	name: string
}

/** An @-mention pill for referencing a person in a comment. */
export function Mention({ name }: MentionProps) {
	return <span className="cmt-mention">@{name}</span>
}
