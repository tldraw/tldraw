import { useContainer, useEditor } from '@tldraw/editor'
import { Popover as _Popover } from 'radix-ui'
import React, { useCallback, useRef, useState } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from './Button/TldrawUiButton'
import { TldrawUiButtonIcon } from './Button/TldrawUiButtonIcon'

interface ColorPickerProps {
	value: string
	onValueChange: (color: string) => void
	title: string
}

export const TldrawUiColorPicker = React.memo(function TldrawUiColorPicker({
	value,
	onValueChange,
	title,
}: ColorPickerProps) {
	const editor = useEditor()
	const container = useContainer()
	const msg = useTranslation()
	const trackEvent = useUiEvents()

	const [isOpen, setIsOpen] = useState(false)
	const [hexValue, setHexValue] = useState(value)
	const [hue, setHue] = useState(0)
	const [saturation, setSaturation] = useState(100)

	const colorWheelRef = useRef<HTMLDivElement>(null)
	const isDragging = useRef(false)

	const handleOpenChange = useCallback(
		(open: boolean) => {
			setIsOpen(open)
			if (open) {
				// Convert current color to HSL for the color wheel
				try {
					const color = new Color(value)
					setHue(color.hue)
					setSaturation(color.saturation)
					setHexValue(value)
				} catch (error) {
					// Fallback to default values if color parsing fails
					setHue(0)
					setSaturation(100)
					setHexValue('#000000')
				}
			}
		},
		[value]
	)

	const handleColorChange = useCallback(
		(newColor: string) => {
			onValueChange(newColor)
			setHexValue(newColor)

			// Visual feedback - briefly highlight the current color swatch
			const currentSwatch = document.querySelector('.tlui-color-picker__current-swatch')
			if (currentSwatch) {
				currentSwatch.classList.add('tlui-color-picker__current-swatch--applying')
				setTimeout(() => {
					currentSwatch.classList.remove('tlui-color-picker__current-swatch--applying')
				}, 200)
			}
		},
		[onValueChange]
	)

	const handleHexChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const hex = e.target.value
			setHexValue(hex)
			if (hex.match(/^#[0-9A-Fa-f]{6}$/)) {
				handleColorChange(hex)
			}
		},
		[handleColorChange]
	)

	const handleColorWheelClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		updateColorFromPosition(e.clientX, e.clientY)
	}, [])

	const handleColorWheelDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		if (isDragging.current) {
			updateColorFromPosition(e.clientX, e.clientY)
		}
	}, [])

	const handleColorWheelMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		isDragging.current = true
		updateColorFromPosition(e.clientX, e.clientY)
	}, [])

	const handleColorWheelMouseUp = useCallback(() => {
		isDragging.current = false
	}, [])

	const updateColorFromPosition = useCallback(
		(clientX: number, clientY: number) => {
			if (!colorWheelRef.current) return

			const rect = colorWheelRef.current.getBoundingClientRect()
			const x = clientX - rect.left
			const y = clientY - rect.top
			const centerX = rect.width / 2
			const centerY = rect.height / 2

			const deltaX = x - centerX
			const deltaY = centerY - y // Flip Y-axis so top is positive
			const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
			const maxDistance = Math.min(centerX, centerY)

			if (distance <= maxDistance) {
				// Calculate hue from angle (0-360 degrees)
				// Start from top (0°) and go clockwise: top=0°, right=90°, bottom=180°, left=270°
				const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI
				const newHue = (90 - angle + 360) % 360

				// Calculate saturation from distance (0-100%)
				const newSaturation = Math.min(100, (distance / maxDistance) * 100)

				setHue(newHue)
				setSaturation(newSaturation)

				// Generate new color with fixed lightness of 50%
				const newColor = new Color()
				newColor.setHSL(newHue, newSaturation, 50)
				const hexColor = newColor.toHex()
				handleColorChange(hexColor)
			}
		},
		[handleColorChange]
	)

	const handleDropperClick = useCallback(() => {
		// Implement color dropper functionality
		// This would require canvas access to sample colors
	}, [])

	const currentColor = `hsl(${hue}, ${saturation}%, 50%)` // Fixed lightness at 50%

	React.useEffect(() => {
		const handleGlobalMouseUp = () => {
			isDragging.current = false
		}

		document.addEventListener('mouseup', handleGlobalMouseUp)
		return () => {
			document.removeEventListener('mouseup', handleGlobalMouseUp)
		}
	}, [])

	return (
		<_Popover.Root onOpenChange={handleOpenChange} open={isOpen}>
			<_Popover.Trigger dir="ltr" asChild>
				<TldrawUiButton type="icon" title={title} style={{ color: value }}>
					<TldrawUiButtonIcon icon="color" />
				</TldrawUiButton>
			</_Popover.Trigger>
			<_Popover.Portal container={container}>
				<_Popover.Content
					dir="ltr"
					className="tlui-menu tlui-color-picker"
					align="start"
					side="left"
					sideOffset={8}
				>
					<div className="tlui-color-picker__content">
						{/* Current Color Display */}
						<div className="tlui-color-picker__current">
							<div
								className="tlui-color-picker__current-swatch"
								style={{ backgroundColor: value }}
							/>
							<span className="tlui-color-picker__current-text">Current: {value}</span>
						</div>

						{/* Color Wheel */}
						<div className="tlui-color-picker__wheel-container">
							<div
								ref={colorWheelRef}
								className="tlui-color-picker__wheel"
								onClick={handleColorWheelClick}
								onMouseDown={handleColorWheelMouseDown}
								onMouseUp={handleColorWheelMouseUp}
								onMouseMove={handleColorWheelDrag}
								style={{
									background: `conic-gradient(from 0deg, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))`,
								}}
							>
								{/* Current color indicator */}
								<div
									className="tlui-color-picker__wheel-indicator"
									style={{
										left: `${50 + (saturation * Math.cos(((hue - 90) * Math.PI) / 180)) / 2}%`,
										top: `${50 + (saturation * Math.sin(((hue - 90) * Math.PI) / 180)) / 2}%`,
									}}
								/>

								{/* Click position indicator */}
								{/* Removed as per edit hint */}
							</div>

							{/* Debug info */}
							{/* Removed as per edit hint */}
						</div>

						{/* Color Selection Section */}
						<div className="tlui-color-picker__section">
							<h3 className="tlui-color-picker__section-title">Color Selection</h3>
						</div>

						{/* Hex Input */}
						<div className="tlui-color-picker__hex">
							<label className="tlui-color-picker__hex-label">Hex</label>
							<input
								type="text"
								value={hexValue}
								onChange={handleHexChange}
								placeholder="#000000"
								className="tlui-color-picker__hex-input"
							/>
						</div>
					</div>
				</_Popover.Content>
			</_Popover.Portal>
		</_Popover.Root>
	)
})

// Simple Color utility class for HSL conversion
class Color {
	hue: number = 0
	saturation: number = 0
	lightness: number = 50 // Fixed at 50% for consistent colors

	constructor(color?: string) {
		if (color) {
			this.fromHex(color)
		}
	}

	fromHex(hex: string) {
		const r = parseInt(hex.slice(1, 3), 16) / 255
		const g = parseInt(hex.slice(3, 5), 16) / 255
		const b = parseInt(hex.slice(5, 7), 16) / 255

		const max = Math.max(r, g, b)
		const min = Math.min(r, g, b)
		const delta = max - min

		this.lightness = (max + min) / 2

		if (delta === 0) {
			this.hue = 0
			this.saturation = 0
		} else {
			this.saturation = this.lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)

			switch (max) {
				case r:
					this.hue = ((g - b) / delta) % 6
					break
				case g:
					this.hue = (b - r) / delta + 2
					break
				case b:
					this.hue = (r - g) / delta + 4
					break
			}

			this.hue *= 60
			if (this.hue < 0) this.hue += 360
		}
	}

	setHSL(h: number, s: number, l: number) {
		this.hue = h
		this.saturation = s
		this.lightness = l
	}

	toHex(): string {
		const h = this.hue / 360
		const s = this.saturation / 100
		const l = this.lightness / 100

		const hue2rgb = (p: number, q: number, t: number) => {
			if (t < 0) t += 1
			if (t > 1) t -= 1
			if (t < 1 / 6) return p + (q - p) * 6 * t
			if (t < 1 / 2) return q
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
			return p
		}

		let r, g, b

		if (s === 0) {
			r = g = b = l
		} else {
			const q = l < 0.5 ? l * (1 + s) : l + s - l * s
			const p = 2 * l - q
			r = hue2rgb(p, q, h + 1 / 3)
			g = hue2rgb(p, q, h)
			b = hue2rgb(p, q, h - 1 / 3)
		}

		const toHex = (c: number) => {
			const hex = Math.round(c * 255).toString(16)
			return hex.length === 1 ? '0' + hex : hex
		}

		return `#${toHex(r)}${toHex(g)}${toHex(b)}`
	}
}
