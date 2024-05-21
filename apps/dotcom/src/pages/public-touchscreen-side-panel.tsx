import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import '../../styles/globals.css'

export function Component() {
	useEffect(() => {
		async function createSession() {
			if ('meet' in window === false) {
				setTimeout(createSession, 100)
				return
			}

			const session = await (window as any).meet.addon.createAddonSession({
				cloudProjectNumber: `${process.env.GOOGLE_CLOUD_PROJECT_NUMBER}`,
			})
			const sidePanelClient = await session.createSidePanelClient()
			await sidePanelClient.setCollaborationStartingState({
				sidePanelUrl: `${window.location.origin}/tc-side`,
				mainStageUrl: `${window.location.origin}/tc`,
				additionalData: undefined,
			})
		}

		createSession()
	})

	return (
		<>
			<Helmet>
				{/* eslint-disable @next/next/no-sync-scripts */}
				<script src="https://www.gstatic.com/meetjs/addons/0.1.0/meet.addons.js"></script>
			</Helmet>
			Starting a new session…
		</>
	)
}
