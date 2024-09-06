import { useQuickReactor, useValue } from '@tldraw/state-react'
import React, { useState } from 'react'
import { useCanvasEvents } from '../hooks/useCanvasEvents'
import { useEditor } from '../hooks/useEditor'
import { featureFlags } from '../utils/debug-flags'
import { stopEventPropagation } from '../utils/dom'
import { LicenseManager } from './LicenseManager'
import { useLicenseContext } from './LicenseProvider'

/** @internal */
export const Watermark = React.memo(function Watermark() {
	const events = useCanvasEvents()

	const editor = useEditor()
	const licenseManager = useLicenseContext()

	const isDebugMode = useValue('debug mode', () => editor.getInstanceState().isDebugMode, [editor])
	const isMenuOpen = useValue('is menu open', () => editor.getIsMenuOpen(), [editor])
	const isMobile = useValue('is mobile', () => editor.getViewportScreenBounds().width < 760, [
		editor,
	])

	const [src, setSrc] = useState<string | null>(null)

	useQuickReactor(
		'set watermark src',
		async () => {
			const showWatermark =
				featureFlags.enableLicensing.get() &&
				['licensed-with-watermark', 'unlicensed'].includes(licenseManager.state.get())

			let src: string | null = null
			if (showWatermark) src = await licenseManager.getWatermarkUrl()
			setSrc((prev) => (prev === src ? prev : src))
		},
		[licenseManager]
	)

	if (!src) return null

	const className = LicenseManager.className
	const maskCss = `url('${src}') center 100% / 100% no-repeat`

	if (isMobile) {
		return (
			<>
				<style>{`${LICENSE_NOTE}

.${className} {
	position: absolute;
	bottom: 8px;
	right: 0px;
	width: 12px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 2147483647 !important;
	pointer-events: ${isMenuOpen ? 'none' : 'all'};
	background-color: color-mix(in srgb, var(--color-background) 50%, transparent);
	border-radius: 4px;
}

.${className}[data-debug='true'] {
	bottom: 46px;
}

.${className} > a {
	position: relative;
	display: block;
	transform: rotateZ(90deg);
	font-size: 8px;
	font-weight: 600;
	pointer-events: none;
	padding: 2px;
	cursor: inherit;
	color: var(--color-text);
	opacity: .28;
	line-height: 1;
	text-decoration: none;
}

@media (hover: hover) {
	.${className}:hover {
		color: currentColor;
		transition: color 0.2s ease-in-out;
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
`}</style>
				<div className={className} data-debug={isDebugMode} draggable={false} {...events}>
					<a href="https://tldraw.dev/">tldraw</a>
				</div>
			</>
		)
	}

	return (
		<>
			<style>
				{`${LICENSE_NOTE}

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

const LICENSE_NOTE = `/* ------------------- SEE LICENSE -------------------
The tldraw watermark is part of tldraw's license. It is shown for unlicensed
or "licensed-with-watermark" users. By using this library, you agree to
keep the watermark's behavior, keeping it visible, unobscured, and
available to user-interaction.

To remove the watermark, please purchase a license at tldraw.dev.
*/`
