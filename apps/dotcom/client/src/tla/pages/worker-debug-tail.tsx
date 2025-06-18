import { useCallback, useEffect, useRef } from 'react'
import { fetch } from 'tldraw'
import { MULTIPLAYER_SERVER } from '../../utils/config'

export function Component() {
	const ref = useRef<HTMLDivElement>(null)
	const isAutoScroll = useRef(true)
	const onClear = useCallback(async function onClear() {
		await fetch('/api/app/__debug-tail/clear', { method: 'POST' })
		ref.current!.innerHTML = ''
	}, [])
	useEffect(() => {
		const elem = ref.current
		if (!elem) return
		const socket = new WebSocket(MULTIPLAYER_SERVER + '/app/__debug-tail')
		socket.onmessage = (msg) => {
			const div = document.createElement('pre')
			div.textContent = msg.data
			elem.appendChild(div)
			if (isAutoScroll.current) {
				elem.scrollTo({ top: elem.scrollHeight })
			}
		}
		socket.onerror = (err) => {
			console.error(err)
		}
		socket.onclose = () => {
			setTimeout(() => {
				window.location.reload()
			}, 500)
		}

		const onScroll = () => {
			isAutoScroll.current = elem.scrollTop + elem.clientHeight > elem.scrollHeight - 100
		}
		const onKeyPress = (ev: KeyboardEvent) => {
			if (ev.key === 'k') {
				onClear()
			}
		}
		elem.addEventListener('scroll', onScroll)
		window.addEventListener('keypress', onKeyPress)
		return () => {
			socket.close()
			elem.removeEventListener('scroll', onScroll)
			window.removeEventListener('keypress', onKeyPress)
		}
	}, [onClear])
	return (
		<>
			<div
				style={{ padding: '4px 8px', cursor: 'pointer', position: 'fixed', top: 0, right: 0 }}
				onClick={onClear}
				// eslint-disable-next-line react/jsx-no-literals
			>
				🗑️
			</div>
			<div ref={ref} style={{ fontFamily: 'monospace', overflow: 'scroll', height: '100vh' }}></div>
		</>
	)
}
