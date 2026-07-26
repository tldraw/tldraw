import { render } from '@testing-library/react'
import { ReactNode } from 'react'
import { LicenseContext, LicenseManager } from 'tldraw'
import { CommentCard } from '../ui/comment-card'
import { CommentText } from '../ui/comment-text'

/**
 * A stand-in for the real manager: the gate only ever calls `isFeatureEnabled`, so the tests can
 * supply the answer directly rather than minting license keys.
 */
function withLicense(commenting: boolean, children: ReactNode) {
	const licenseManager = {
		isFeatureEnabled: (feature: string) => feature === 'commenting' && commenting,
	} as unknown as LicenseManager
	return <LicenseContext.Provider value={licenseManager}>{children}</LicenseContext.Provider>
}

describe('commenting license gate', () => {
	it('renders a component when commenting is licensed', () => {
		const { container } = render(withLicense(true, <CommentText text="hello" />))
		expect(container.textContent).toBe('hello')
	})

	it('renders nothing when commenting is not licensed', () => {
		const { container } = render(withLicense(false, <CommentText text="hello" />))
		expect(container.innerHTML).toBe('')
	})

	it('renders nothing outside a license provider', () => {
		// `LicenseContext` defaults to an empty object. No provider means no license, so the gate has
		// to fail closed here rather than throwing on the missing method.
		const { container } = render(<CommentText text="hello" />)
		expect(container.innerHTML).toBe('')
	})

	it('gates components that render other gated components', () => {
		const { container } = render(
			withLicense(false, <CommentCard author={{ name: 'Ada' }} body="hi" date="" you={false} />)
		)
		expect(container.innerHTML).toBe('')
	})
})
