import React, { useCallback, useRef } from 'react'
import { useValue } from 'tldraw'
import { apps } from './apps'
import { TldrawMark } from './TldrawMark'
import {
	closeWindow,
	focusWindow,
	minimizeWindow,
	moveWindow,
	resizeWindow,
	toggleMaximize,
	windowsAtom,
	WindowState,
} from './WindowManager'

const MIN_W = 320
const MIN_H = 200
const REMIX_LABEL = 'Remix This'
const REMIX_URL = 'https://tldraw.dev'

export function AppWindow({ id }: { id: string }) {
	const win = useValue('window', () => windowsAtom.get().find((w) => w.id === id), [id])
	const titlebarRef = useRef<HTMLDivElement | null>(null)
	const resizeRef = useRef<HTMLDivElement | null>(null)
	const dragState = useRef<{
		mode: 'drag' | 'resize'
		startX: number
		startY: number
		baseX: number
		baseY: number
		baseW: number
		baseH: number
	} | null>(null)

	const onTitlebarPointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			const w = windowsAtom.get().find((x) => x.id === id)
			if (!w || w.maximized) return
			if ((e.target as HTMLElement).closest('.desktop-window__control')) return
			e.preventDefault()
			focusWindow(id)
			;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
			dragState.current = {
				mode: 'drag',
				startX: e.clientX,
				startY: e.clientY,
				baseX: w.x,
				baseY: w.y,
				baseW: w.w,
				baseH: w.h,
			}
		},
		[id]
	)

	const onResizePointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			const w = windowsAtom.get().find((x) => x.id === id)
			if (!w || w.maximized) return
			e.preventDefault()
			e.stopPropagation()
			focusWindow(id)
			;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
			dragState.current = {
				mode: 'resize',
				startX: e.clientX,
				startY: e.clientY,
				baseX: w.x,
				baseY: w.y,
				baseW: w.w,
				baseH: w.h,
			}
		},
		[id]
	)

	const onPointerMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			const s = dragState.current
			if (!s) return
			const dx = e.clientX - s.startX
			const dy = e.clientY - s.startY
			if (s.mode === 'drag') {
				moveWindow(id, s.baseX + dx, s.baseY + dy)
			} else {
				resizeWindow(id, Math.max(MIN_W, s.baseW + dx), Math.max(MIN_H, s.baseH + dy))
			}
		},
		[id]
	)

	const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (dragState.current) {
			;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
			dragState.current = null
		}
	}, [])

	if (!win) return null
	const app = apps[win.appId]
	const focused = isTop(win)

	const style = win.maximized
		? ({
				inset: 0,
				zIndex: win.zIndex,
			} as const)
		: ({
				transform: `translate(${win.x}px, ${win.y}px)`,
				width: win.w,
				height: win.h,
				zIndex: win.zIndex,
			} as const)

	return (
		<div
			className="desktop-window"
			data-maximized={win.maximized || undefined}
			data-focused={focused || undefined}
			style={style}
			onPointerDownCapture={() => focusWindow(id)}
		>
			<div
				ref={titlebarRef}
				className="desktop-window__titlebar"
				onPointerDown={onTitlebarPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
				onDoubleClick={() => toggleMaximize(id)}
			>
				<div className="desktop-window__controls">
					<button
						type="button"
						className="desktop-window__control desktop-window__control--close"
						aria-label="Close"
						title="Close"
						onPointerDown={(e) => e.stopPropagation()}
						onClick={() => closeWindow(id)}
					>
						<svg viewBox="0 0 10 10" aria-hidden="true">
							<path d="M1 1 L9 9 M9 1 L1 9" strokeWidth="1.5" />
						</svg>
					</button>
					<button
						type="button"
						className="desktop-window__control desktop-window__control--minimize"
						aria-label="Minimize"
						title="Minimize"
						onPointerDown={(e) => e.stopPropagation()}
						onClick={() => minimizeWindow(id)}
					>
						<svg viewBox="0 0 10 10" aria-hidden="true">
							<rect x="1" y="6" width="8" height="2" />
						</svg>
					</button>
					<button
						type="button"
						className="desktop-window__control desktop-window__control--maximize"
						aria-label={win.maximized ? 'Restore' : 'Maximize'}
						title={win.maximized ? 'Restore' : 'Maximize'}
						onPointerDown={(e) => e.stopPropagation()}
						onClick={() => toggleMaximize(id)}
					>
						<svg viewBox="0 0 10 10" aria-hidden="true">
							<rect x="1" y="1" width="8" height="8" fill="none" strokeWidth="1.5" />
						</svg>
					</button>
				</div>
				{!win.maximized && <div className="desktop-window__title">{app.title}</div>}
				<a
					className="desktop-window__remix"
					href={REMIX_URL}
					target="_blank"
					rel="noopener noreferrer"
					title={REMIX_LABEL}
					onPointerDown={(e) => e.stopPropagation()}
				>
					{REMIX_LABEL}
					<TldrawMark className="desktop-window__remix-mark" />
				</a>
			</div>
			<div className="desktop-window__body">
				<iframe
					className="desktop-window__iframe"
					src={app.url}
					title={app.title}
					sandbox={
						app.trusted
							? 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals'
							: 'allow-scripts allow-popups allow-popups-to-escape-sandbox'
					}
					referrerPolicy="origin"
					allow="clipboard-read; clipboard-write"
				/>
			</div>
			<div
				ref={resizeRef}
				className="desktop-window__resize-handle"
				onPointerDown={onResizePointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
				aria-hidden="true"
			/>
		</div>
	)
}

function isTop(win: WindowState): boolean {
	const all = windowsAtom.get().filter((w) => !w.minimized)
	if (all.length === 0) return false
	return all.every((w) => w.zIndex <= win.zIndex)
}
