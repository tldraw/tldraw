/* eslint-disable tldraw/jsx-no-literals */
import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
	fetch,
	SerializedSchema,
	TldrawPreview,
	TLRecord,
	TLStoreSnapshot,
	useEvent,
	useValue,
} from 'tldraw'
import { routes } from '../../routeDefs'
import { assetUrls } from '../../utils/assetUrls'
import { MULTIPLAYER_SERVER } from '../../utils/config'
import { multiplayerAssetStore } from '../../utils/multiplayerAssetStore'
import { useMaybeApp } from '../hooks/useAppState'
import { useTldrawCurrentUser } from '../hooks/useUser'
import { TlaSidebarLayout } from '../layouts/TlaSidebarLayout/TlaSidebarLayout'
import { focusOnPreviewBounds } from './grid-focus-camera'
import { parseJsonInWorker } from './grid-parse'
import { PREVIEW_BOUNDS } from './grid-preview-bounds'

// Suppress the internal LoadingScreen that TldrawViewer renders while the editor
// is initializing — tile keeps its blank background instead.
const EMPTY_COMPONENTS = { LoadingScreen: () => null }

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
				<h1 style={{ marginBottom: 16 }}>Grid — read-only preview per tile</h1>
				<p style={{ marginBottom: 16, opacity: 0.7 }}>
					{files.length} file{files.length === 1 ? '' : 's'}. Each tile fetches a snapshot over HTTP
					and renders with TldrawPreview (no event handlers, no UI, no sync).
				</p>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
						gap: 16,
					}}
				>
					{files.map(({ fileId }) => (
						<GridTile key={fileId} fileId={fileId} name={app.getFileName(fileId) || fileId} />
					))}
				</div>
			</div>
		</TlaSidebarLayout>
	)
}

function GridTile({ fileId, name }: { fileId: string; name: string }) {
	const user = useTldrawCurrentUser()
	const getUserToken = useEvent(async () => (await user?.getToken()) ?? 'not-logged-in')

	const containerRef = useRef<HTMLAnchorElement>(null)
	const [isVisible, setIsVisible] = useState(false)

	useEffect(() => {
		if (isVisible || !containerRef.current) return
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					setIsVisible(true)
					observer.disconnect()
				}
			},
			{ rootMargin: '400px' }
		)
		observer.observe(containerRef.current)
		return () => observer.disconnect()
	}, [isVisible])

	const [snapshot, setSnapshot] = useState<TLStoreSnapshot | null>(null)
	const [error, setError] = useState<string | null>(null)
	const timings = useRef<{
		t0: number
		tFetched: number
		tParsed: number
		tSet: number
		recordCount: number
	} | null>(null)

	useEffect(() => {
		if (!isVisible) return
		let cancelled = false
		const t0 = performance.now()
		const b = PREVIEW_BOUNDS
		const boundsKey = `${b.x},${b.y},${b.w},${b.h}`
		;(async () => {
			try {
				const token = await getUserToken()
				const headers: Record<string, string> = {}
				if (token && token !== 'not-logged-in') {
					headers['Authorization'] = `Bearer ${token}`
				}
				const httpBase = MULTIPLAYER_SERVER.replace(/^ws/, 'http')
				const url = `${httpBase}/app/file/${fileId}/download?bounds=${boundsKey}`
				const res = await fetch(url, { headers })
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				const text = await res.text()
				const tFetched = performance.now()
				const data = await parseJsonInWorker<{
					tldrawFileFormatVersion: number
					schema: SerializedSchema
					records: TLRecord[]
				}>(text)
				const tParsed = performance.now()
				if (cancelled) return
				setSnapshot({
					schema: data.schema,
					store: Object.fromEntries(data.records.map((r) => [r.id, r])),
				})
				timings.current = {
					t0,
					tFetched,
					tParsed,
					tSet: performance.now(),
					recordCount: data.records.length,
				}
			} catch (e) {
				console.error(`[grid:${fileId}] fetch error`, e)
				if (!cancelled) setError(String(e))
			}
		})()
		return () => {
			cancelled = true
		}
	}, [fileId, getUserToken, isVisible])

	const assets = useMemo(
		() => multiplayerAssetStore({ getFileId: () => fileId, getToken: getUserToken }),
		[fileId, getUserToken]
	)

	return (
		<Link
			ref={containerRef}
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
				{error ? (
					<div style={{ padding: 12, fontSize: 12, color: 'red' }}>{error}</div>
				) : snapshot ? (
					<div style={{ position: 'absolute', inset: 0 }}>
						<TldrawPreview
							snapshot={snapshot}
							assets={assets}
							licenseKey={getLicenseKey()}
							assetUrls={assetUrls}
							components={EMPTY_COMPONENTS}
							onMount={(editor) => {
								try {
									focusOnPreviewBounds(editor)
									const shapes = editor.getCurrentPageShapeIds().size
									const tMount = performance.now()
									const t = timings.current
									if (t) {
										const network = Math.round(t.tFetched - t.t0)
										const parse = Math.round(t.tParsed - t.tFetched)
										const load = Math.round(t.tSet - t.t0)
										const render = Math.round(tMount - t.tSet)
										const total = Math.round(tMount - t.t0)
										console.warn(
											`[grid:${fileId}] ${shapes} shapes (${t.recordCount} records) — load ${load}ms (network ${network} + parse ${parse}) + render ${render}ms = total ${total}ms`
										)
									}
								} catch (e) {
									console.error(`[grid:${fileId}] onMount error`, e)
								}
							}}
						/>
					</div>
				) : null}
			</div>
		</Link>
	)
}
