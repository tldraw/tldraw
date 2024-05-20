import { useEffect } from 'react'
import '../../styles/globals.css'
import { IFrameProtector, ROOM_CONTEXT } from '../components/IFrameProtector'
import { LocalEditor } from '../components/LocalEditor'

export function Component() {
	useEffect(() => {
		async function loadSession() {
			const session = await (window as any).meet.addon.createAddonSession({
				cloudProjectNumber: `${process.env.GOOGLE_CLOUD_PROJECT_NUMBER}`,
			})
			const mainStageClient = await session.createMainStageClient()
			await mainStageClient.unloadSidePanel()
		}

		loadSession()
	}, [])

	return (
		<IFrameProtector slug="ts" context={ROOM_CONTEXT.PUBLIC_TOUCHSCREEN_APP}>
			<LocalEditor />
		</IFrameProtector>
	)
}
