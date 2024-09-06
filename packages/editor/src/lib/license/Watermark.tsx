import { useQuickReactor, useValue } from '@tldraw/state-react'
import { memo, useState } from 'react'
import { useCanvasEvents } from '../hooks/useCanvasEvents'
import { useEditor } from '../hooks/useEditor'
import { featureFlags } from '../utils/debug-flags'
import { stopEventPropagation } from '../utils/dom'
import { LicenseManager } from './LicenseManager'
import { useLicenseContext } from './LicenseProvider'

/** @internal */
export const Watermark = memo(function Watermark() {
	const licenseManager = useLicenseContext()
	const [srcs, setSrcs] = useState<string[] | null>(null)

	useQuickReactor(
		'set watermark src',
		async () => {
			const showWatermark =
				featureFlags.enableLicensing.get() &&
				['licensed-with-watermark', 'unlicensed'].includes(licenseManager.state.get())

			let src: string[] | null = null
			if (showWatermark) src = await licenseManager.getWatermarkUrl()
			setSrcs((prev) => (prev === src ? prev : src))
		},
		[licenseManager]
	)

	if (!srcs) return null

	return (
		<>
			<LicenseStyles />
			<WatermarkInner srcs={srcs} />
		</>
	)
})

const WatermarkInner = memo(function WatermarkInner({ srcs }: { srcs: string[] }) {
	const editor = useEditor()
	const isDebugMode = useValue('debug mode', () => editor.getInstanceState().isDebugMode, [editor])
	const isMenuOpen = useValue('is menu open', () => editor.getIsMenuOpen(), [editor])
	const isMobile = useValue('is mobile', () => editor.getViewportScreenBounds().width < 760, [
		editor,
	])
	const events = useCanvasEvents()

	const maskCss = `url('${srcs[isMobile ? 1 : 0]}') center 100% / 100% no-repeat`

	return (
		<div
			className={LicenseManager.className}
			data-debug={isDebugMode}
			data-menu={isMenuOpen}
			data-mobile={isMobile}
			draggable={false}
			{...events}
		>
			<a
				href="https://tldraw.dev"
				target="_blank"
				rel="noreferrer"
				draggable={false}
				onPointerDown={stopEventPropagation}
				style={{ mask: maskCss, WebkitMask: maskCss }}
			/>
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
		z-index: 2147483647 !important;
		background-color: color-mix(in srgb, var(--color-background) 62%, transparent);
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
		background-color: currentColor;
		opacity: .28;
	}

	
	.${className}[data-menu='true'] {
		pointer-events: none;
	}

	.${className}[data-debug='true'] {
		bottom: 46px;
	}
	
	.${className}[data-mobile='true'] {
		right: 0px;
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
