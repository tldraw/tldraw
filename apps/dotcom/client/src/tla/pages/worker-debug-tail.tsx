import { useEffect, useRef } from 'react'
import { MULTIPLAYER_SERVER } from '../../utils/config'

export function Component() {
	const ref = useRef<HTMLDivElement>(null)
	const isAutoScroll = useRef(true)
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
		elem.addEventListener('scroll', onScroll)
		return () => {
			socket.close()
			elem.removeEventListener('scroll', onScroll)
		}
	}, [])
	return (
		<div ref={ref} style={{ fontFamily: 'monospace', overflow: 'scroll', height: '100vh' }}></div>
	)
}
