import { ReactNode } from 'react'
import { useLicenseContext, useLicenseFeatureFlag } from 'tldraw'

/**
 * Whether commenting is licensed for this editor. Enabled in development; in production it requires
 * a tldraw license that includes the commenting feature (or the collaboration umbrella that grants
 * it). Reactive: re-reads when license validation resolves, and returns `false` while validation is
 * pending, so gated UI stays hidden until the license is confirmed.
 *
 * Every component this package exports gates on this. Use it to gate any custom commenting UI the
 * same way.
 * @public
 */
export function useCommentingEnabled(): boolean {
	return useLicenseFeatureFlag(useLicenseContext(), 'commenting')
}

/**
 * Wraps a commenting component so it renders nothing unless commenting is licensed.
 *
 * The gate lives in a wrapper rather than an early return inside each component because the license
 * flag flips after async validation resolves. An early return would change how many hooks the
 * component calls between the pending render and the licensed one, which React rejects. Wrapping
 * keeps the inner component's hooks all-or-nothing: it either mounts fully or not at all.
 *
 * @internal
 */
export function withCommentingLicense<P extends object>(
	Component: (props: P) => ReactNode
): (props: P) => ReactNode {
	function LicensedComponent(props: P) {
		const commentingEnabled = useCommentingEnabled()
		if (!commentingEnabled) return null
		return <Component {...props} />
	}
	LicensedComponent.displayName = Component.name || 'LicensedComponent'
	return LicensedComponent
}
