import { TlaWrapperPage } from '../components/TlaWrapperPage'
import { useTldrawUser } from '../hooks/useUser'

export function Component() {
	const user = useTldrawUser()
	// const state = useApp()
	// const user = useValue('user', () => (tldrawUser ? state.get<TldrawAppUser>(tldrawUser?.id) : null), [
	// 	tldrawUser
	// ])
	// if (!user) {
	// 	throw new Error('User not found')
	// }
	return (
		<>
			<TlaWrapperPage>
				<div className="tla-page__header">
					<h2 className="tla-text_ui__big">Profile</h2>
					<div>name: {user?.clerkUser.fullName}</div>
				</div>
			</TlaWrapperPage>
		</>
	)
}
