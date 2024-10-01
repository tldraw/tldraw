import { useTldrawUser } from '../hooks/useUser'
import { TlaPageLayout } from '../layouts/TlaPageLayout/TlaPageLayout'

export function Component() {
	const user = useTldrawUser()

	if (!user) return null

	return (
		<>
			<TlaPageLayout>
				<div className="tla-page__header">
					<h2 className="tla-text_ui__big">Profile</h2>
					<div>name: {user.clerkUser.fullName}</div>
				</div>
			</TlaPageLayout>
		</>
	)
}
