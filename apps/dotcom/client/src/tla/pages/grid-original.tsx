/* eslint-disable tldraw/jsx-no-literals */
import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useSync } from '@tldraw/sync'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Tldraw, useEvent, useValue } from 'tldraw'
import { routes } from '../../routeDefs'
import { assetUrls } from '../../utils/assetUrls'
import { MULTIPLAYER_SERVER } from '../../utils/config'
import { multiplayerAssetStore } from '../../utils/multiplayerAssetStore'
import { useMaybeApp } from '../hooks/useAppState'
import { useTldrawCurrentUser } from '../hooks/useUser'
import { TlaSidebarLayout } from '../layouts/TlaSidebarLayout/TlaSidebarLayout'
import { focusOnPreviewBounds } from './grid-focus-camera'

export function Component() {
	const app = useMaybeApp()
	const files = useValue('my files', () => app?.getMyFiles() ?? [], [app])

	if (!app) {
		return (
			<div style={{ padding: 20 }}>
				<p>Sign in to view the grid.</p>
			</div>
		)
	}

	return (
		<TlaSidebarLayout>
			<div style={{ padding: '60px 20px 20px 60px', overflow: 'auto', height: '100%' }}>
				<h1 style={{ marginBottom: 16 }}>Grid (original) — full editor per tile</h1>
				<p style={{ marginBottom: 16, opacity: 0.7 }}>
					{files.length} file{files.length === 1 ? '' : 's'}. Each tile mounts a regular Tldraw
					component with its own sync connection.
				</p>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
						gap: 16,
					}}
				>
					{files.map(({ fileId }) => (
						<GridTileOriginal
							key={fileId}
							fileId={fileId}
							name={app.getFileName(fileId) || fileId}
						/>
					))}
				</div>
			</div>
		</TlaSidebarLayout>
	)
}

function GridTileOriginal({ fileId, name }: { fileId: string; name: string }) {
	const user = useTldrawCurrentUser()
	const getUserToken = useEvent(async () => (await user?.getToken()) ?? 'not-logged-in')
	const hasUser = !!user

	const assets = useMemo(
		() => multiplayerAssetStore({ getFileId: () => fileId, getToken: getUserToken }),
		[fileId, getUserToken]
	)

	const t0Ref = useRef(performance.now())
	const tSyncedRef = useRef<number | null>(null)
	const store = useSync({
		uri: useCallback(async () => {
			const url = new URL(`${MULTIPLAYER_SERVER}/app/file/${fileId}`)
			if (hasUser) {
				url.searchParams.set('accessToken', await getUserToken())
			}
			return url.toString()
		}, [fileId, hasUser, getUserToken]),
		assets,
	})

	useEffect(() => {
		if (store.status === 'synced-remote') {
			if (tSyncedRef.current === null) {
				tSyncedRef.current = performance.now()
			}
		}
	}, [fileId, store.status])

	return (
		<Link
			to={routes.tlaFile(fileId)}
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 6,
				color: 'inherit',
				textDecoration: 'none',
				cursor: 'pointer',
			}}
		>
			<div
				style={{
					fontSize: 13,
					fontWeight: 500,
					whiteSpace: 'nowrap',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
				}}
				title={name}
			>
				{name}
			</div>
			<div
				style={{
					aspectRatio: '4 / 3',
					border: '1px solid var(--tla-color-border, #e0e0e0)',
					borderRadius: 8,
					overflow: 'hidden',
					position: 'relative',
					background: 'var(--color-low, #fafafa)',
				}}
			>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						pointerEvents: 'none',
					}}
				>
					<Tldraw
						store={store}
						licenseKey={getLicenseKey()}
						assetUrls={assetUrls}
						hideUi
						onMount={(editor) => {
							focusOnPreviewBounds(editor)
							const tMount = performance.now()
							const t0 = t0Ref.current
							const tSync = tSyncedRef.current ?? tMount
							const shapes = editor.getCurrentPageShapeIds().size
							const sync = Math.round(tSync - t0)
							const render = Math.round(tMount - tSync)
							const total = Math.round(tMount - t0)
							console.warn(
								`[grid-original:${fileId}] ${shapes} shapes — sync ${sync}ms + render ${render}ms = total ${total}ms`
							)
						}}
					/>
				</div>
			</div>
		</Link>
	)
}
