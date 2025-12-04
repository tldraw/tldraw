import { FairyHatColor, FairyHatType, FairyPose, HAT_COLORS, HAT_TYPES } from '@tldraw/fairy-shared'
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiInput,
	TldrawUiSlider,
	useValue,
} from 'tldraw'
import { useMsg } from '../../../tla/utils/i18n'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { fairyMessages } from '../../fairy-messages'
import { FairySprite } from '../../fairy-sprite/FairySprite'

const PREVIEW_POSES: FairyPose[] = [
	'idle',
	'reading',
	'writing',
	'thinking',
	'working',
	'sleeping',
	'panicking',
	'reviewing',
	'soaring',
]

export function FairyConfigurationDialog({
	agent,
	onClose,
}: {
	agent: FairyAgent
	onClose(): void
}) {
	const config = useValue('fairy-config', () => agent.getConfig(), [agent])

	const [name, setName] = useState(config.name)
	const [hatType, setHatType] = useState<FairyHatType>(config.hat)
	const [hatColor, setHatColor] = useState<FairyHatColor>(config.hatColor)
	const [legLength, setLegLength] = useState(config.legLength)
	const [poseIndex, setPoseIndex] = useState(0)
	const [isSpriteHovered, setIsSpriteHovered] = useState(false)
	const cancelledRef = useRef(false)

	const currentPose = PREVIEW_POSES[poseIndex % PREVIEW_POSES.length]

	const handlePoseClick = useCallback(() => {
		setPoseIndex((i) => (i + 1) % PREVIEW_POSES.length)
	}, [])

	const namePlaceholder = useMsg(fairyMessages.fairyNamePlaceholder)
	const configureFairyLabel = useMsg(fairyMessages.configureFairy)

	const hasChanges =
		name !== config.name ||
		hatType !== config.hat ||
		hatColor !== config.hatColor ||
		legLength !== config.legLength

	// Keep a ref to current values for the cleanup effect
	const valuesRef = useRef({ name, hatType, hatColor, legLength, config })
	valuesRef.current = { name, hatType, hatColor, legLength, config }

	// Save on unmount (when dialog closes) unless cancelled
	useEffect(() => {
		return () => {
			if (cancelledRef.current) return
			const { name, hatType, hatColor, legLength, config } = valuesRef.current
			const changed =
				name !== config.name ||
				hatType !== config.hat ||
				hatColor !== config.hatColor ||
				legLength !== config.legLength
			if (changed) {
				agent.updateFairyConfig({
					name,
					hat: hatType,
					hatColor,
					legLength,
				})
			}
		}
	}, [agent])

	// Cancel discards changes
	const handleCancel = useCallback(() => {
		cancelledRef.current = true
		onClose()
	}, [onClose])

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{configureFairyLabel}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className="fairy-configure-dialog-body">
				{/* Preview */}
				<div className="fairy-configure-preview">
					<button
						className="fairy-configure-preview-sprite"
						onClick={handlePoseClick}
						onMouseEnter={() => setIsSpriteHovered(true)}
						onMouseLeave={() => setIsSpriteHovered(false)}
						type="button"
					>
						<FairySprite
							pose={currentPose}
							hatColor={hatColor}
							hatType={hatType}
							legLength={legLength}
							isAnimated={isSpriteHovered}
							showShadow={true}
						/>
					</button>
				</div>

				{/* Fields grid */}
				<div className="fairy-configure-fields">
					{/* Name input */}
					<label className="fairy-configure-label">Name</label>
					<div className="fairy-configure-name-row">
						<TldrawUiInput
							className="fairy-configure-input"
							value={name}
							onValueChange={setName}
							placeholder={namePlaceholder}
							disabled={true}
							autoFocus
						/>
						{/* <TldrawUiButton
							className="fairy-configure-random-name-button"
							type="icon"
							title="Random name"
							onClick={() => setName(getRandomFairyName())}
						>
							<TldrawUiButtonIcon icon={<RefreshIcon />} />
						</TldrawUiButton> */}
					</div>

					{/* Hat type slider */}
					<label className="fairy-configure-label">Hat</label>
					<div className="fairy-configure-hat-row">
						<TldrawUiSlider
							title="Hat"
							label={(HAT_TYPES.indexOf(hatType) + 1).toString()}
							value={HAT_TYPES.indexOf(hatType)}
							steps={HAT_TYPES.length - 1}
							onValueChange={(index) => setHatType(HAT_TYPES[index])}
						/>
						{/* Hat color dropdown */}
						<TldrawUiDropdownMenuRoot id="hat-color-select">
							<TldrawUiDropdownMenuTrigger>
								<TldrawUiButton type="normal" className="fairy-configure-dropdown-button">
									<span
										className="fairy-configure-color-swatch"
										style={{ backgroundColor: `var(--tl-color-fairy-${hatColor})` }}
									/>
								</TldrawUiButton>
							</TldrawUiDropdownMenuTrigger>
							<TldrawUiDropdownMenuContent
								side="bottom"
								align="end"
								className="fairy-configure-dropdown-content"
							>
								<div className="tlui-grid">
									{HAT_COLORS.map((color) => (
										<DropdownMenuItem
											key={color}
											label={
												<span
													className="fairy-configure-color-swatch"
													style={{
														backgroundColor: `var(--tl-color-fairy-${color})`,
													}}
												/>
											}
											onClick={() => setHatColor(color)}
										/>
									))}
								</div>
							</TldrawUiDropdownMenuContent>
						</TldrawUiDropdownMenuRoot>
					</div>

					{/* Leg length slider */}
					<label className="fairy-configure-label">Legs</label>
					<div className="fairy-configure-leg-row">
						<TldrawUiSlider
							title="Leg length"
							label={(legLength * 100).toFixed(0) + '%'}
							value={legLength * 100}
							steps={100}
							onValueChange={(value) => setLegLength(value / 100)}
						/>
					</div>
				</div>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={handleCancel}>
					<TldrawUiButtonLabel>Cancel</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="primary" onClick={onClose} disabled={!hasChanges}>
					<TldrawUiButtonLabel>Save</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}

function DropdownMenuItem({ label, onClick }: { label: string | ReactNode; onClick(): void }) {
	return (
		<TldrawUiDropdownMenuItem>
			<TldrawUiButton type="menu" onClick={onClick}>
				<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
			</TldrawUiButton>
		</TldrawUiDropdownMenuItem>
	)
}
