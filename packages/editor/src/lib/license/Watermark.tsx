import { useValue } from '@tldraw/state-react'
import { fetch } from '@tldraw/utils'
import React, { useEffect, useState } from 'react'
import { useCanvasEvents } from '../hooks/useCanvasEvents'
import { useEditor } from '../hooks/useEditor'
import { getDefaultCdnBaseUrl } from '../utils/assets'
import { featureFlags } from '../utils/debug-flags'
import { stopEventPropagation } from '../utils/dom'
import { watermarkDesktopSvg } from '../watermarks'
import { LicenseManager } from './LicenseManager'
import { useLicenseContext } from './LicenseProvider'

/** @internal */
export const WATERMARK_REMOTE_SRC = `${getDefaultCdnBaseUrl()}/watermarks/watermark-desktop.svg`
export const WATERMARK_LOCAL_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(watermarkDesktopSvg)}`

let watermarkUrlPromise: Promise<string> | null = null
async function getWatermarkUrl(forceLocal: boolean): Promise<string> {
	if (forceLocal) {
		return WATERMARK_LOCAL_SRC
	}

	if (!watermarkUrlPromise) {
		watermarkUrlPromise = Promise.race([
			// try and load the remote watermark, if it fails, fallback to the local one
			(async () => {
				try {
					const response = await fetch(WATERMARK_REMOTE_SRC)
					if (!response.ok) return WATERMARK_LOCAL_SRC
					const blob = await response.blob()
					return URL.createObjectURL(blob)
				} catch {
					return WATERMARK_LOCAL_SRC
				}
			})(),

			// but if that's taking a long time (>3s) just show the local one anyway
			new Promise<string>((resolve) => {
				// eslint-disable-next-line no-restricted-globals
				setTimeout(() => {
					resolve(WATERMARK_LOCAL_SRC)
				}, 3_000)
			}),
		])
	}

	return watermarkUrlPromise
}

/** @internal */
export const Watermark = React.memo(function Watermark({
	forceLocal = false,
}: {
	forceLocal?: boolean
}) {
	const events = useCanvasEvents()

	const editor = useEditor()
	const licenseManager = useLicenseContext()

	const showWatermark = useValue(
		'show watermark',
		() =>
			featureFlags.enableLicensing.get() &&
			editor.getViewportScreenBounds().width > 760 &&
			licenseManager.state.get() === 'unlicensed',
		[editor, licenseManager]
	)

	const isDebugMode = useValue('debug mode', () => editor.getInstanceState().isDebugMode, [editor])
	const isMenuOpen = useValue('is menu open', () => editor.getIsMenuOpen(), [editor])

	const [src, setSrc] = useState<string | null>(null)
	const shouldUseLocal = forceLocal || licenseManager.isDevelopment
	useEffect(() => {
		if (!showWatermark) return

		let isCancelled = false

		;(async () => {
			const src = await getWatermarkUrl(shouldUseLocal)
			if (isCancelled) return
			setSrc(src)
		})()

		return () => {
			isCancelled = true
		}
	}, [shouldUseLocal, showWatermark])

	if (!showWatermark || !src) return null

	const className = LicenseManager.className
	const maskCss = `url('${src}') center 100% / 100% no-repeat`

	return (
		<>
			<style>
				{`
/* ------------------- SEE LICENSE -------------------
The tldraw watermark is part of tldraw's license. It is shown for unlicensed
users. By using this library, you agree to keep the watermark's behavior, 
keeping it visible, unobscured, and available to user-interaction.

To remove the watermark, please purchase a license at tldraw.dev.
*/

.${className} {
	position: absolute;
	bottom: var(--space-2);
	right: var(--space-2);
	width: 96px;
	height: 32px;
	z-index: 2147483647 !important;
	pointer-events: ${isMenuOpen ? 'none' : 'all'};
	background-color: color-mix(in srgb, var(--color-background) 62%, transparent);
	border-radius: 5px;
	padding: 2px;
	box-sizing: content-box;
}

.${className}[data-debug='true'] {
	bottom: 46px;
}

.${className} > a {
	position: absolute;
	width: 96px;
	height: 32px;
	pointer-events: none;
	cursor: inherit;
	color: var(--color-text);
	background-color: currentColor;
	opacity: .28;
}

@media (hover: hover) {
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
}
`}
			</style>
			<div className={className} data-debug={isDebugMode} draggable={false} {...events}>
				<a
					href="https://tldraw.dev"
					target="_blank"
					rel="noreferrer"
					draggable={false}
					onPointerDown={stopEventPropagation}
					style={{ mask: maskCss, WebkitMask: maskCss }}
				/>
			</div>
		</>
	)
})
