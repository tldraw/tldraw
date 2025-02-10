import { SignInButton } from '@clerk/clerk-react'
import { TlaButton } from '../tla/components/TlaButton/TlaButton'
import { F } from '../tla/utils/i18n'

export function Component() {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '1rem',
				justifyContent: 'center',
				alignItems: 'center',
				flex: 1,
				padding: 20,
				textAlign: 'center',
			}}
		>
			<h2>
				<F defaultMessage="Try the new tldraw (preview)" />
			</h2>
			<p style={{ maxWidth: 400 }}>
				<F defaultMessage="Sign up to access the preview version of tldraw.com, which adds file management and collaboration features." />
			</p>
			<div style={{ display: 'flex', gap: 10 }}>
				<TlaButton
					variant="secondary"
					onClick={() => {
						window.location.href = '/'
					}}
				>
					<F defaultMessage="No thanks" />
				</TlaButton>
				<SignInButton mode="modal" forceRedirectUrl="/">
					<TlaButton data-testid="tla-opt-in">
						<F defaultMessage="Sign up" />
					</TlaButton>
				</SignInButton>
			</div>
		</div>
	)
}
