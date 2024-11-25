'use client'

import { useEffect } from 'react'

export default function () {
	useEffect(() => {
		const script = document.createElement('script')
		script.src = 'https://jobs.ashbyhq.com/tldraw/embed?hidePoweredBy=true'
		script.async = true
		document.body.appendChild(script)

		return () => {
			document.body.removeChild(script)
		}
	}, [])

	return (
		<>
			<div id="ashby_embed" />{' '}
		</>
	)
}
