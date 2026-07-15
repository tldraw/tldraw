import { ReactNode } from 'react'
import { useTranslation } from 'tldraw'
import { Avatar } from './avatar'
import './comments.css'

export interface MentionMember {
	id: string
	name: string
	/** Avatar image URL. Falls back to a coloured initial when omitted. */
	avatar?: string
	/** Avatar background colour, used when there's no `avatar` image. */
	color?: string
	/** A secondary line under the name — e.g. an email or handle. Omit for a single-line row. */
	secondary?: string
	/** Marks the current user; shown as a "(You)" suffix after the name. */
	you?: boolean
	/** Hosts may carry extra fields; a custom `renderMember` can read them. */
	[key: string]: unknown
}

export interface MentionListProps {
	/** Members to choose from — already resolved for the current query by the host. */
	members: MentionMember[]
	/** Index of the highlighted row, driven by the composer's keyboard navigation. */
	activeIndex?: number
	/** Called when a member is chosen (click, or Enter on the active row). */
	onSelect?(member: MentionMember): void
	/** Shown when no member matches the query. Defaults to a translated "No matches". */
	emptyLabel?: string
	/** Override a row's content (inside the selectable button). Defaults to avatar + name (+ secondary). */
	renderMember?(member: MentionMember): ReactNode
}

/** The default row content: avatar, name (with a "(You)" marker), and an optional secondary line. */
function DefaultMemberRow({ member }: { member: MentionMember }) {
	const msg = useTranslation()
	return (
		<>
			<Avatar name={member.name} color={member.color} image={member.avatar} />
			<span className="cmt-mention-list__text">
				<span className="cmt-mention-list__name">
					{member.name}
					{member.you && (
						<span className="cmt-mention-list__you">{`(${msg('comments.mention-you')})`}</span>
					)}
				</span>
				{member.secondary && (
					<span className="cmt-mention-list__secondary">{member.secondary}</span>
				)}
			</span>
		</>
	)
}

/**
 * The @-mention member picker: a popover list of people to mention, shown as the user types after
 * `@`. Presentational — the composer's suggestion plugin owns resolution, keyboard navigation, and
 * placement, and drives this with the host-resolved `members` and the highlighted `activeIndex`.
 */
export function MentionList({
	members,
	activeIndex = 0,
	onSelect,
	emptyLabel,
	renderMember,
}: MentionListProps) {
	const msg = useTranslation()
	if (members.length === 0) {
		return (
			<div className="cmt-mention-list cmt-mention-list--empty">
				{emptyLabel ?? msg('comments.mention-no-matches')}
			</div>
		)
	}
	return (
		<div className="cmt-mention-list" role="listbox">
			{members.map((member, i) => {
				const active = i === activeIndex
				return (
					<button
						key={member.id}
						type="button"
						role="option"
						aria-selected={active}
						className={
							active
								? 'cmt-mention-list__item cmt-mention-list__item--active'
								: 'cmt-mention-list__item'
						}
						// Keep the composer focused on a row press: it's portaled outside the editor, so a
						// bare mousedown would blur the composer — which now dismisses the picker — before
						// the click could select. Selection runs on click; focus stays put.
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => {
							if (onSelect) onSelect(member)
						}}
					>
						{renderMember ? renderMember(member) : <DefaultMemberRow member={member} />}
					</button>
				)
			})}
		</div>
	)
}
