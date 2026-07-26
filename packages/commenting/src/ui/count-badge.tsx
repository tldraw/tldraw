import { withCommentingLicense } from '../canvas/license'
/** @public */
export interface CountBadgeProps {
	count: number
}

/** @public @react */
export const CountBadge = withCommentingLicense(function CountBadge({ count }: CountBadgeProps) {
	return <div className="tlui-cmt-count-badge">{count}</div>
})
