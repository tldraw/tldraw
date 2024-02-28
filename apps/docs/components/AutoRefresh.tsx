'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * For development only, this component refreshes the page when content changes.
 * (see also `watcher.ts` in the root of the project) or https://www.steveruiz.me/posts/nextjs-refresh-content
 */
let AutoRefresh = ({ children }: { children: any }) => {
	return children
}

if (process.env.NODE_ENV === 'development') {
	AutoRefresh = function AutoRefresh({ children }) {
		const router = useRouter()

		useEffect(() => {
			const ws = new WebSocket('ws://localhost:3201')
			ws.onmessage = (event) => {
				if (event.data === 'refresh') {
					router.refresh()
				}
			}
			return () => {
				ws.close()
			}
		}, [router])

		return children
	}
}

export default AutoRefresh
