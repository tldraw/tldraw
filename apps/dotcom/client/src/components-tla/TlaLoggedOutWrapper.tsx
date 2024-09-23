import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { TlaButton } from './TlaButton'

export function TlaLoggedOutWrapper({ children }: { children: ReactNode }) {
	const app = useApp()
	const theme = useValue('theme', () => app.getSessionState().theme, [app])
	return (
		<div
			className={`tla tla-layout tla-logged-out tl-container tla-layout__signedin ${theme === 'light' ? 'tla-theme__light tl-theme__light' : 'tla-theme__dark tl-theme__dark'}`}
		>
			<div className="tla-logged-out__header">
				<Link to="/">
					<img src="/tldraw-logo-2.svg" style={{ height: 20, width: 'auto' }} />
				</Link>
				<TlaButton className="tla-logged-out__signin-button">Sign in</TlaButton>
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
