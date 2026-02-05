import { Tldraw, TldrawUiButton, TldrawUiIcon, tlenv, tlenvReactive, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './environment-detection.css'

// [1]
function EnvironmentInfo() {
	// [2]
	const isCoarsePointer = useValue('coarse pointer', () => tlenvReactive.get().isCoarsePointer, [
		tlenvReactive,
	])

	// [3]
	const buttonSize = isCoarsePointer ? '48px' : '32px'

	return (
		<div className="tlui-menu environment-info">
			{/* [4] Static detection with tlenv */}
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

			{/* [5] Reactive detection with tlenvReactive */}
			<div>
				<strong>Pointer type (reactive):</strong> {isCoarsePointer ? 'Touch' : 'Mouse'}
			</div>

			{/* [6] Adaptive button based on pointer type */}
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

export default function RequestEnvironmentDetectionWithTlenvAndTlenvreactiveExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={{
					// [7]
					TopPanel: EnvironmentInfo,
				}}
			/>
		</div>
	)
}

/*
This example demonstrates environment detection using tlenv and tlenvReactive.

[1] Component that displays environment information

[2] Subscribe to tlenvReactive using useValue hook. Since tlenvReactive is an Atom,
    call .get() to access its value. The isCoarsePointer property updates when users
    switch between touch and mouse input.

[3] Calculate button size based on pointer type - touch needs larger targets (48px)
    while mouse can use smaller buttons (32px)

[4] Display static environment detection with tlenv - platform (isDarwin, isIos, isAndroid)
    and browser (isSafari, isFirefox, isChromeForIos). Note: isIos is checked before isDarwin
    because iPadOS reports as Mac, making both isDarwin and isIos true on iPads.

[5] Display reactive pointer detection that updates when input method changes

[6] Adaptive button that changes size based on pointer type

[7] Render component in front of canvas using InFrontOfTheCanvas slot

Key differences:
- tlenv: Static object, direct property access (tlenv.isDarwin)
- tlenvReactive: Reactive Atom, requires useValue(() => tlenvReactive.get().property, [tlenvReactive])
*/
