import { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/tla.css'
import { USER_ID_KEY } from './TlaAppProvider'
import { TlaButton } from './TlaButton'

export function TlaWrapperLoggedOut({ children }: { children: ReactNode }) {
	const navigate = useNavigate()
	// TODO: sync with editor (this was already broken)
	const defaultTheme: 'light' | 'dark' = window.matchMedia('(prefers-color-scheme: dark)').matches
		? 'dark'
		: 'light'
	return (
		<div
			className={`tla tla-layout tla-logged-out tl-container ${defaultTheme === 'light' ? 'tla-theme__light tl-theme__light' : 'tla-theme__dark tl-theme__dark'}`}
		>
			<div className="tla-logged-out__header">
				<Link to="/">
					<img src="/tla/tldraw-logo-2.svg" style={{ height: 20, width: 'auto' }} />
				</Link>
				<TlaButton
					className="tla-logged-out__signin-button"
					onClick={() => {
						const userid = window.prompt('Enter your user id (trip code lol)')
						if (!userid) return
						// eslint-disable-next-line no-restricted-syntax
						localStorage.setItem(USER_ID_KEY, userid)
						navigate('/q', { replace: true })
					}}
				>
					Sign in
				</TlaButton>
			</div>
			<div className="tla-logged-out__editor-wrapper">{children}</div>
			<div className="tla-logged-out__footer tla-text_ui__regular">
				<p>
					<b>tldraw</b> is a free online whiteboard for you and your friends.{'  '}
					<Link to="/">Learn more</Link>.
				</p>
			</div>
		</div>
	)
}
