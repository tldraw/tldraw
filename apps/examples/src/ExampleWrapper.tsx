import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { uniqueId } from 'tldraw'
import { Example } from './examples'

export function ExampleWrapper({
	example,
	component: Component,
}: {
	example: Example
	component: React.ComponentType<{ roomId?: string }>
}) {
	if (!example.multiplayer) {
		return <Component />
	}

	return <MultiplayerExampleWrapper component={Component} example={example} />
}

interface ScopedRoomId {
	roomId: string
	deployId: string
}

function getExampleKey(exampleSlug: string) {
	return `tldraw-example-room-${exampleSlug}`
}

function getRoomId(exampleSlug: string) {
	const key = getExampleKey(exampleSlug)
	const stored = JSON.parse(localStorage.getItem(key) ?? 'null') as null | ScopedRoomId
	if (stored && stored.deployId === process.env.TLDRAW_DEPLOY_ID) {
		return stored.roomId
	}
	return uniqueId()
}

function storeRoomId(exampleSlug: string, slug: string) {
	const key = getExampleKey(exampleSlug)
	localStorage.setItem(
		key,
		JSON.stringify({
			roomId: slug,
			deployId: process.env.TLDRAW_DEPLOY_ID!,
		} satisfies ScopedRoomId)
	)
}

function useConfirmState() {
	const [confirm, setConfirm] = useState(false)
	const [confirmTimeout, setConfirmTimeout] = useState<number | null>(null)

	const confirmFn = useCallback(() => {
		setConfirm(true)
		setConfirmTimeout(window.setTimeout(() => setConfirm(false), 3000))
	}, [])

	useEffect(() => {
		return () => {
			if (confirmTimeout) {
				clearTimeout(confirmTimeout)
			}
		}
	}, [confirmTimeout])

	return [confirm, confirmFn] as const
}

function MultiplayerExampleWrapper({
	component: Component,
	example,
}: {
	example: Example
	component: React.ComponentType<{ roomId?: string }>
}) {
	const [params, setParams] = useSearchParams()
	const [confirm, confirmFn] = useConfirmState()
	const exampleSlug = example.path.replace(/^\/?/g, '')
	let roomId = params.get('roomId')
	if (!roomId || typeof roomId !== 'string' || encodeURIComponent(roomId) !== roomId) {
		roomId = getRoomId(exampleSlug)
	}

	useEffect(() => {
		if (roomId === params.get('roomId')) return
		storeRoomId(exampleSlug, roomId)
		setParams({ ...params, roomId }, { replace: true })
	}, [exampleSlug, roomId, setParams, params])

	return (
		<div className="MultiplayerExampleWrapper">
			<div className="MultiplayerExampleWrapper-picker">
				<WifiIcon />
				<div>Live Example</div>
				<button
					className="MultiplayerExampleWrapper-copy"
					onClick={() => {
						// copy current url with roomId=roomId to clipboard
						const url = new URL(window.location.href)
						url.searchParams.set('roomId', roomId)
						navigator.clipboard.writeText(url.toString())
						confirmFn()
					}}
					aria-label="join"
				>
					Copy link
					{confirm && <div className="MultiplayerExampleWrapper-copied">Copied!</div>}
				</button>
			</div>
			<div className="MultiplayerExampleWrapper-example">
				<Component roomId={roomId} />
			</div>
		</div>
	)
}

function WifiIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			width={16}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z"
			/>
		</svg>
	)
}
