import { Link, useNavigate } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { TlaCloseButton } from './TlaCloseButton'

type TlaPageErrorType =
	| 'file-not-found'
	| 'no-file-access'
	| 'no-workspace-access'
	| 'no-user-access'

export function TlaErrorPage({ error }: { error: TlaPageErrorType }) {
	const app = useApp()
	const theme = useValue('theme', () => app.getSessionState().theme, [app])
	const navigate = useNavigate()

	return (
		<div
			className={`${theme === 'light' ? 'tla-theme__light' : 'tla-theme__dark'} tla tla-layout tl-container`}
			data-sidebar="false"
		>
			<TlaCloseButton onClose={() => navigate('/')} />
			<div className="tla-content tla-error__page">
				<TlaErrorPageContent error={error} />
			</div>
		</div>
	)
}

export function TlaErrorPageContent({ error }: { error: TlaPageErrorType }) {
	switch (error) {
		case 'file-not-found': {
			return (
				<div className="tla-error__container">
					<p className="tla-text_ui__regular">Sorry, that file doesn’t exist.</p>
					<Link className="tla-text_ui__regular tla-error__link" to="/">
						Take me home
					</Link>
				</div>
			)
		}
		case 'no-file-access': {
			return (
				<div className="tla-error__container">
					<p className="tla-text_ui__regular">
						Sorry, you don’t have access to that file. If you know whose created the file, you can
						request a new invite link.
					</p>
					<Link className="tla-text_ui__regular tla-error__link" to="/">
						Take me home
					</Link>
				</div>
			)
		}
		case 'no-workspace-access': {
			return (
				<div className="tla-error__container">
					<p className="tla-text_ui__regular">Sorry, you don’t have access to that workspace.</p>
					<Link className="tla-text_ui__regular tla-error__link" to="/">
						Take me home
					</Link>
				</div>
			)
		}
		case 'no-user-access': {
			return (
				<div className="tla-error__container">
					<p className="tla-text_ui__regular">Sorry, you don’t have access to that user.</p>
					<Link className="tla-text_ui__regular tla-error__link" to="/">
						Take me home
					</Link>
				</div>
			)
		}
		default: {
			throw Error(`No handler for error: ${error}`)
		}
	}

	return null
}
