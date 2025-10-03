import { useValue } from '@tldraw/state-react'
import { memo, useRef } from 'react'
import { useCanvasEvents } from '../hooks/useCanvasEvents'
import { useEditor } from '../hooks/useEditor'
import { usePassThroughWheelEvents } from '../hooks/usePassThroughWheelEvents'
import { preventDefault } from '../utils/dom'
import { runtime } from '../utils/runtime'
import { watermarkDesktopSvg, watermarkMobileSvg } from '../watermarks'
import { LicenseManager } from './LicenseManager'
import { useLicenseContext } from './LicenseProvider'
import { useLicenseManagerState } from './useLicenseManagerState'

const WATERMARK_DESKTOP_LOCAL_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(watermarkDesktopSvg)}`
const WATERMARK_MOBILE_LOCAL_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(watermarkMobileSvg)}`

/** @internal */
export const Watermark = memo(function Watermark() {
	const licenseManager = useLicenseContext()
	const editor = useEditor()
	const isMobile = useValue('is mobile', () => editor.getViewportScreenBounds().width < 700, [
		editor,
	])

	const licenseManagerState = useLicenseManagerState(licenseManager)

	if (!['licensed-with-watermark', 'unlicensed'].includes(licenseManagerState)) return null

	return (
		<>
			<LicenseStyles />
			<WatermarkInner
				src={isMobile ? WATERMARK_MOBILE_LOCAL_SRC : WATERMARK_DESKTOP_LOCAL_SRC}
				isUnlicensed={licenseManagerState === 'unlicensed'}
			/>
		</>
	)
})

const UnlicensedWatermark = memo(function UnlicensedWatermark({
	isDebugMode,
	isMobile,
}: {
	isDebugMode: boolean
	isMobile: boolean
}) {
	const editor = useEditor()
	const events = useCanvasEvents()
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)

	const url =
		'https://tldraw.dev/pricing?utm_source=dotcom&utm_medium=organic&utm_campaign=watermark'

	return (
		<div
			ref={ref}
			className={LicenseManager.className}
			data-debug={isDebugMode}
			data-mobile={isMobile}
			data-unlicensed={true}
			data-testid="tl-watermark-unlicensed"
			draggable={false}
			{...events}
		>
			<button
				draggable={false}
				role="button"
				onPointerDown={(e) => {
					editor.markEventAsHandled(e)
					preventDefault(e)
				}}
				title="The tldraw SDK requires a license key to work in production. You can get a free 100-day trial license at tldraw.dev/pricing."
				onClick={() => runtime.openWindow(url, '_blank')}
			>
				Get a license for production
			</button>
		</div>
	)
})

const WatermarkInner = memo(function WatermarkInner({
	src,
	isUnlicensed,
}: {
	src: string
	isUnlicensed: boolean
}) {
	const editor = useEditor()
	const isDebugMode = useValue('debug mode', () => editor.getInstanceState().isDebugMode, [editor])
	const isMobile = useValue('is mobile', () => editor.getViewportScreenBounds().width < 700, [
		editor,
	])
	const events = useCanvasEvents()

	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)

	const maskCss = `url('${src}') center 100% / 100% no-repeat`
	const url = 'https://tldraw.dev/?utm_source=dotcom&utm_medium=organic&utm_campaign=watermark'

	if (isUnlicensed) {
		return <UnlicensedWatermark isDebugMode={isDebugMode} isMobile={isMobile} />
	}

	return (
		<div
			ref={ref}
			className={LicenseManager.className}
			data-debug={isDebugMode}
			data-mobile={isMobile}
			data-testid="tl-watermark-licensed"
			draggable={false}
			{...events}
		>
			<button
				draggable={false}
				role="button"
				onPointerDown={(e) => {
					editor.markEventAsHandled(e)
					preventDefault(e)
				}}
				title="Build infinite canvas applications with the tldraw SDK. Learn more at https://tldraw.dev."
				onClick={() => runtime.openWindow(url, '_blank')}
				style={{ mask: maskCss, WebkitMask: maskCss }}
			/>
		</div>
	)
})

const LicenseStyles = memo(function LicenseStyles() {
	const editor = useEditor()
	const className = LicenseManager.className

	const CSS = `
/* ------------------- SEE LICENSE -------------------
The tldraw watermark is part of tldraw's license. It is shown for unlicensed
or "licensed-with-watermark" users. By using this library, you agree to
preserve the watermark's behavior, keeping it visible, unobscured, and
available to user-interaction.

To remove the watermark, please purchase a license at tldraw.dev.
*/

.${className} {
	position: absolute;
	bottom: max(var(--tl-space-2), env(safe-area-inset-bottom));
	right: max(var(--tl-space-2), env(safe-area-inset-right));
	width: 96px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: var(--tl-layer-watermark) !important;
	background-color: color-mix(in srgb, var(--tl-color-background) 62%, transparent);
	opacity: 1;
	border-radius: 5px;
	pointer-events: all;
	padding: 2px;
	box-sizing: content-box;
}

.${className} > button {
	position: absolute;
	width: 96px;
	height: 32px;
	pointer-events: all;
	cursor: inherit;
	color: var(--tl-color-text);
	opacity: .38;
	border: 0;
	padding: 0;
	background-color: currentColor;
}

.${className}[data-debug='true'] {
	bottom: max(46px, env(safe-area-inset-bottom));
}

.${className}[data-mobile='true'] {
	border-radius: 4px 0px 0px 4px;
	right: max(-2px, calc(env(safe-area-inset-right) - 2px));
	width: 8px;
	height: 48px;
}

.${className}[data-mobile='true'] > button {
	width: 8px;
	height: 32px;
}

.${className}[data-unlicensed='true'] > button {
	font-size: 100px;
	position: absolute;
	pointer-events: all;
	cursor: pointer;
	color: var(--tl-color-text);
	opacity: 0.8;
	border: 0;
	padding: 0;
	background-color: transparent;
	font-size: 11px;
	font-weight: 600;
	text-align: center;
}

.${className}[data-mobile='true'][data-unlicensed='true'] > button {
	display: none;
}

@media (hover: hover) {
	.${className} > button {
		pointer-events: none;
	}

	.${className}:hover {
		background-color: var(--tl-color-background);
		transition: background-color 0.2s ease-in-out;
		transition-delay: 0.32s;
	}

	.${className}:hover > button {
		animation: ${className}_delayed_link 0.2s forwards ease-in-out;
		animation-delay: 0.32s;
	}

	.${className} > button:focus-visible {
		opacity: 1;
	}
}

@keyframes ${className}_delayed_link {
	0% {
		cursor: inherit;
		opacity: .38;
		pointer-events: none;
	}
	100% {
		cursor: pointer;
		opacity: 1;
		pointer-events: all;
	}
}`

	return <style nonce={editor.options.nonce}>{CSS}</style>
})
