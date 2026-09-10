import { Tldraw, TldrawUiButton, TldrawUiIcon, tlenv, tlenvReactive, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './environment-detection.css'

function EnvironmentInfo() {
	// [1]
	const isCoarsePointer = useValue('coarse pointer', () => tlenvReactive.get().isCoarsePointer, [])

	// [2]
	const buttonSize = isCoarsePointer ? '48px' : '32px'

	return (
		<div className="tlui-menu environment-info">
			{/* [3] */}
			<div>
				<strong>Platform (tlenv):</strong> {tlenv.isIos && 'iOS'}
				{tlenv.isDarwin && !tlenv.isIos && 'macOS'}
				{tlenv.isAndroid && 'Android'}
				{!tlenv.isDarwin && !tlenv.isIos && !tlenv.isAndroid && 'Other'}
			</div>
			<div>
				<strong>Browser:</strong> {tlenv.isSafari && 'Safari'}
				{tlenv.isFirefox && 'Firefox'}
				{tlenv.isChromeForIos && 'Chrome for iOS'}
				{!tlenv.isSafari && !tlenv.isFirefox && !tlenv.isChromeForIos && 'Other'}
			</div>
			<div>
				<strong>Modifier key:</strong> {tlenv.isDarwin ? '⌘ Cmd' : 'Ctrl'}
			</div>
			<div>
				<strong>Pointer type (tlenvReactive):</strong> {isCoarsePointer ? 'Touch' : 'Mouse'}
			</div>
			<TldrawUiButton
				type="normal"
				style={{
					width: buttonSize,
					height: buttonSize,
					border: '1px solid var(--tl-color-text-3)',
				}}
				onClick={() => alert(`Button size: ${buttonSize}`)}
			>
				<TldrawUiIcon icon="dot" label="Dot" />
			</TldrawUiButton>
		</div>
	)
}

const components = {
	TopPanel: EnvironmentInfo,
}

export default function EnvironmentDetectionExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

/*
[1]
`tlenvReactive` is an atom, so read it inside `useValue` to re-render when it changes. On a
touchscreen laptop `isCoarsePointer` flips as the user switches between touching the screen and
using the trackpad. `tlenv` is a plain object whose values are fixed at load time, so it can be
read directly during render.

[2]
Touch needs bigger targets than a mouse: 48px for a coarse pointer, 32px for a fine one.

[3]
`isIos` is checked before `isDarwin` because iPadOS reports itself as a Mac, so both are true on
an iPad.
*/
