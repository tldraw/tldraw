import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import posthog from 'posthog-js'
import { useCallback, useEffect, useState } from 'react'

export default function Example() {
	const track = usePosthog()

	const [_uiEvents, setUiEvents] = useState<string[]>([])
	const [uiEventLog, setUiEventLog] = useState('')
	const onUiEvent = useCallback(
		(eventName: string, eventData: any) => {
			// eslint-disable-next-line no-console
			console.log('[%cui-event%c]', 'color: red', 'color: initial', eventName)
			setUiEvents((old) => old.concat(eventName))
			let message = eventName
			if (eventData !== null && eventData !== undefined) {
				message += '=' + JSON.stringify(eventData, null, 2)
			}
			setUiEventLog((old) => old + message + '\n')

			// !!!!!! NOTE: Uncomment to enable !!!!!!
			// track(eventName, eventData)
		},
		[track]
	)

	return (
		<div style={{ display: 'flex' }}>
			<div style={{ width: '60vw', height: '100vh' }}>
				<Tldraw autoFocus onUiEvent={onUiEvent} />
			</div>
			<textarea
				style={{
					width: '40vw',
					height: '100vh',
					padding: 8,
					background: '#eee',
					border: 'none',
					borderLeft: 'solid 2px #333',
				}}
				value={uiEventLog}
				disabled={true}
			/>
		</div>
	)
}

function usePosthog() {
	useEffect(() => {
		posthog.init('phc_PcpuJUqYFJqfsY8GwJ9TPPCLEOjjarXGYWjlRR9gn3F', {
			api_host: 'https://eu.posthog.com',
		})
	})

	return useCallback((eventName: string, eventData: string) => {
		posthog.capture(eventName, {value: eventData})
	}, [])
}
