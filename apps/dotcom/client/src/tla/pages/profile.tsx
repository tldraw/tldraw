import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { useAuth } from '../hooks/useAuth'
import { TlaWrapperPage } from '../layouts/TlaWrapperPage'
import { TldrawAppUser } from '../utils/schema/TldrawAppUser'

export function Component() {
	const auth = useAuth()
	const state = useApp()
	const user = useValue('user', () => (auth ? state.get<TldrawAppUser>(auth?.userId) : null), [
		auth?.userId,
		state,
	])
	if (!user) {
		throw new Error('User not found')
	}
	return (
		<>
			<TlaWrapperPage>
				<div className="tla-page__header">
					<h2 className="tla-text_ui__big">Profile</h2>
					<div>name: {user.name}</div>
				</div>
			</TlaWrapperPage>
		</>
	)
}
