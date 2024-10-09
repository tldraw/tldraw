import { useValue } from '@tldraw/state-react'
import { memo, useRef } from 'react'
import { tlenv } from '../globals/environment'
import { useCanvasEvents } from '../hooks/useCanvasEvents'
import { useEditor } from '../hooks/useEditor'
import { usePassThroughWheelEvents } from '../hooks/usePassThroughWheelEvents'
import { preventDefault, stopEventPropagation } from '../utils/dom'
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
			<WatermarkInner src={isMobile ? WATERMARK_MOBILE_LOCAL_SRC : WATERMARK_DESKTOP_LOCAL_SRC} />
		</>
	)
})

const WatermarkInner = memo(function WatermarkInner({ src }: { src: string }) {
	const editor = useEditor()
	const isDebugMode = useValue('debug mode', () => editor.getInstanceState().isDebugMode, [editor])
	const isMenuOpen = useValue('is menu open', () => editor.menus.hasAnyOpenMenus(), [editor])
	const isMobile = useValue('is mobile', () => editor.getViewportScreenBounds().width < 700, [
		editor,
	])
	const events = useCanvasEvents()

	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)

	const maskCss = `url('${src}') center 100% / 100% no-repeat`
	const url = 'https://tldraw.dev'

	return (
		<div
			ref={ref}
			className={LicenseManager.className}
			data-debug={isDebugMode}
			data-menu={isMenuOpen}
			data-mobile={isMobile}
			draggable={false}
			{...events}
		>
			{tlenv.isWebview ? (
				<a
					draggable={false}
					role="button"
					onPointerDown={(e) => {
						stopEventPropagation(e)
						preventDefault(e)
					}}
					onClick={() => runtime.openWindow(url, '_blank')}
					style={{ mask: maskCss, WebkitMask: maskCss }}
				/>
			) : (
				<a
					href={url}
					target="_blank"
					rel="noreferrer"
					draggable={false}
					onPointerDown={(e) => {
						stopEventPropagation(e)
					}}
					style={{ mask: maskCss, WebkitMask: maskCss }}
				/>
			)}
		</div>
	)
})

const LicenseStyles = memo(function LicenseStyles() {
	const className = LicenseManager.className

	const CSS = `/* ------------------- SEE LICENSE -------------------
The tldraw watermark is part of tldraw's license. It is shown for unlicensed
or "licensed-with-watermark" users. By using this library, you agree to
preserve the watermark's behavior, keeping it visible, unobscured, and
available to user-interaction.

To remove the watermark, please purchase a license at tldraw.dev.
*/

	.${className} {
		position: absolute;
		bottom: var(--space-2);
		right: var(--space-2);
		width: 96px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: var(--layer-watermark) !important;
		background-color: color-mix(in srgb, var(--color-background) 62%, transparent);
		opacity: 1;
		border-radius: 5px;
		pointer-events: all;
		padding: 2px;
		box-sizing: content-box;
	}
	
	.${className} > a {
		position: absolute;
		width: 96px;
		height: 32px;
		pointer-events: all;
		cursor: inherit;
		color: var(--color-text);
		opacity: .38;
		background-color: currentColor;
	}

	
	.${className}[data-menu='true'] {
		pointer-events: none;
	}

	.${className}[data-debug='true'] {
		bottom: 46px;
	}
	
	.${className}[data-mobile='true'] {
		border-radius: 4px 0px 0px 4px;
		right: -2px;
		width: 8px;
		height: 48px;
	}

	.${className}[data-mobile='true'] > a {
		width: 8px;
		height: 32px;
	}
	
	@media (hover: hover) {
		.${className} > a {
			pointer-events: none;
		}

		.${className}:hover {
			background-color: var(--color-background);
			transition: background-color 0.2s ease-in-out;
			transition-delay: 0.32s;
		}
			
		.${className}:hover > a {
			animation: delayed_link 0.2s forwards ease-in-out;
			animation-delay: 0.32s;
		}
	}
	

	@keyframes delayed_link {
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

	return <style>{CSS}</style>
})
