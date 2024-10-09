import { useAuthUser } from '../hooks/db-hooks'
import { useRaw } from '../hooks/useRaw'
import { TlaPageLayout } from '../layouts/TlaPageLayout/TlaPageLayout'

export function Component() {
	const raw = useRaw()
	const user = useAuthUser()

	if (!user) return null

	return (
		<>
			<TlaPageLayout>
				<div className="tla-page__header">
					<h2 className="tla-text_ui__big">{raw('Profile')}</h2>
					<div>{raw(`name: ${user.email}`)}</div>
				</div>
			</TlaPageLayout>
		</>
	)
}
