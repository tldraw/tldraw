import { CreateRoomRequestBody, ROOM_PREFIX, Snapshot } from '@tldraw/dotcom-shared'
import { schema } from '@tldraw/tlsync'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { TldrawUiButton } from 'tldraw'
import '../../styles/globals.css'
import { getParentOrigin } from '../utils/iFrame'

export function Component() {
	const [isCreating, setIsCreating] = useState(false)
	const [isSessionStarted, setIsSessionStarted] = useState(false)

	async function createSession() {
		setIsCreating(true)
		if ('meet' in window === false) {
			setTimeout(createSession, 100)
			return
		}

		const snapshot = {
			schema: schema.serialize(),
			snapshot: {},
		} satisfies Snapshot

		const res = await fetch(`/api/new-room`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				origin: getParentOrigin(),
				snapshot,
			} satisfies CreateRoomRequestBody),
		})

		const response = (await res.json()) as { error: boolean; slug?: string }
		if (!res.ok || response.error) {
			console.error(await res.text())
			throw new Error('Failed to upload snapshot')
		}
		const mainStageUrl = `${window.location.origin}/${ROOM_PREFIX}/${response.slug}`

		const session = await (window as any).meet.addon.createAddonSession({
			cloudProjectNumber: `${process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER}`,
		})
		const sidePanelClient = await session.createSidePanelClient()
		await sidePanelClient.setCollaborationStartingState({
			sidePanelUrl: `${window.location.origin}/ts-side`,
			mainStageUrl: mainStageUrl,
			additionalData: undefined,
		})

		setIsCreating(false)
		setIsSessionStarted(true)
	}

	return (
		<>
			<Helmet>
				{/* eslint-disable @next/next/no-sync-scripts */}
				<script src="https://www.gstatic.com/meetjs/addons/0.1.0/meet.addons.js"></script>
			</Helmet>

			<div
				style={{
					flexDirection: 'column',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					height: '100%',
				}}
			>
				<TldrawUiButton
					type="primary"
					disabled={isCreating || isSessionStarted}
					onClick={createSession}
					style={{
						color: isCreating || isSessionStarted ? 'hsl(210, 6%, 45%)' : 'hsl(214, 84%, 56%)',
					}}
				>
					{isSessionStarted ? 'Room created' : 'Create a new room'}
				</TldrawUiButton>
				{isCreating && <div>Starting a new session…</div>}
				{isSessionStarted && <div>Room created, click Start Activity below.</div>}
			</div>
		</>
	)
}
