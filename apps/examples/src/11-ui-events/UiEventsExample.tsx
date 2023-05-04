import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import posthog from 'posthog-js'
import { useCallback, useEffect, useState } from 'react'

/**
 * event types: (WIP)
 *
 *  - [ ] document:load_current
 *  - [ ] document:new
 *  - [ ] document:open
 *  - [ ] document:save
 *  - [ ] document:close
 *  - [ ] page:add
 *  - [ ] page:remove
 *  - [ ] page:rename
 *  - [ ] document.focus.enabled={true,false}
 *  - [ ] document:grid_{on,off}
 *  - [ ] document:tool_lock_{on,off}
 *  - [ ] document:snapping_{on,off}
 *  - [x] app.currentPageId.change
 *  - [x] app.print
 *  - [x] app.copy
 *  - [x] app.paste
 *  - [x] app.export
 *  - [ ] shape:embed:create
 *  - [ ] shape:embed:convert_bookmark
 *  - [ ] shape:geo:create
 *  - [ ] shape:geo:change
 *  - [ ] shape:geo:remove
 *  - [ ] multiplayer:join
 *  - [ ] multiplayer:reconnect
 *  - [ ] multiplayer:leave
 *  - [ ] multiplayer:conflict
 *  - [ ] ui:enter_desktop
 *  - [ ] ui:exit_desktop
 *  - [ ] ui:enter_mobile
 *  - [ ] ui:exit_mobile
 *  - [ ] ui:btn:trash
 *  - [ ] ui:btn:duplicate
 *
 * @returns
 */
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
			track(eventName, eventData)
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
		posthog.capture(eventName, eventData)
	}, [])
}

/**
 * See <https://developer.matomo.org/guides/tracking-javascript-guide>
 * @returns
 */
function useMatomo() {
	// const queueRef = useRef([])
	/**
	 * Essentially just adds the following
	 *
	 *   <script defer data-domain="tldraw.com" src="https://plausible.io/js/script.[SCRIPT_OPTIONS].js"></script>
	 *
	 * See <https://plausible.io/docs/script-extensions#all-our-script-extensions> for extensions
	 */
	useEffect(() => {
		const scriptElement = document.createElement('script')
		scriptElement.async = true
		scriptElement.innerText = `
			console.log("DONE");

			var _paq = window._paq = window._paq || [];
			/* tracker methods like "setCustomDimension" should be called before "trackPageView" */
			_paq.push(['trackPageView']);
			_paq.push(['enableLinkTracking']);
			(function() {
				var u="https://tldraw.matomo.cloud/";
				_paq.push(['setTrackerUrl', u+'matomo.php']);
				_paq.push(['setSiteId', '1']);
				var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
				g.async=true; g.src='//cdn.matomo.cloud/tldraw.matomo.cloud/matomo.js'; s.parentNode.insertBefore(g,s);
			})();
		`

		document.body.appendChild(scriptElement)

		return () => {
			document.body.removeChild(scriptElement)
		}
	}, [])

	return (eventName: string, eventData: any) => {
		_paq.push(['trackEvent', 'user', eventName, eventData])
		// window.plausible(eventName, {props: eventData});
		// console.log("TODO:", {eventName, eventData})
	}
}

type buildPlausibleUrlOpts = {
	trackLocal: boolean
}
function buildPlausibleUrl({ trackLocal }: buildPlausibleUrlOpts) {
	let url = 'https://plausible.io/js/script.'
	if (trackLocal) {
		url += 'local'
	}
	url += '.js'
	return url
}

declare global {
	interface Window {
		plausible: (key: string, value: any) => void
	}
}

type usePlausibleOpts = {
	trackLocal?: boolean
}
export function usePlausible(domain: string, opts: usePlausibleOpts = {}) {
	const { trackLocal = false } = opts
	// const queueRef = useRef([])
	/**
	 * Essentially just adds the following
	 *
	 *   <script defer data-domain="tldraw.com" src="https://plausible.io/js/script.[SCRIPT_OPTIONS].js"></script>
	 *
	 * See <https://plausible.io/docs/script-extensions#all-our-script-extensions> for extensions
	 */
	useEffect(() => {
		const scriptElement = document.createElement('script')

		scriptElement.src = buildPlausibleUrl({ trackLocal })
		scriptElement.async = true
		scriptElement.setAttribute('data-domain', domain)

		document.body.appendChild(scriptElement)

		return () => {
			document.body.removeChild(scriptElement)
		}
	}, [domain, trackLocal])

	return (eventName: string, eventData: any) => {
		window.plausible(eventName, { props: eventData })
	}
}
