/** @public */
export interface MentionProps {
	name: string
}

/** An \@-mention pill for referencing a person. @public @react */
export function Mention({ name }: MentionProps) {
	return <span className="tlui-cmt-mention">@{name}</span>
}
