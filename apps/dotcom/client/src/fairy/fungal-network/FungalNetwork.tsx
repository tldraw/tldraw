import { convertTldrawIdToSimpleId, SmallSpinner } from '@tldraw/fairy-shared'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
	Box,
	isShape,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiIcon,
	TLShape,
	TLShapeId,
	useDialogs,
	useEditor,
	useValue,
} from 'tldraw'
import '../../tla/styles/fairy.css'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { useFairyApp } from '../fairy-app/FairyAppProvider'
import { FungalNetworkState } from '../fairy-app/managers/FairyAppFungalNetworksManager'

const COUNTDOWN_DURATION_MS = 1500

export function FungalNetwork({ network }: { network: FungalNetworkState }) {
	const editor = useEditor()
	const fairyApp = useFairyApp()
	// const toasts = useToasts()

	// Agent management
	const agent = useValue(
		'agent',
		() => {
			if (!fairyApp) return undefined
			// Reuse shape-bound agent logic (using network.id as fake shape id)
			const existing = fairyApp.agents.getShapeBoundAgent(network.id)
			if (existing) return existing
			return fairyApp.agents.createShapeBoundAgent(network.id, {
				onError: fairyApp.getOnError(),
				getToken: () => fairyApp.getToken(),
			})
		},
		[fairyApp, network.id]
	)

	// // Message handling - toast notifications
	// const messages = useValue(
	// 	'messages',
	// 	() => {
	// 		if (!agent) return []
	// 		const history = agent.chat.getHistory()
	// 		const allMessages = history
	// 			.filter(
	// 				(item): item is ChatHistoryActionItem =>
	// 					item.type === 'action' && item.action._type === 'message'
	// 			)
	// 			.map((item) => ({
	// 				text: (item.action as { _type: 'message'; text: string }).text,
	// 				complete: item.action.complete ?? true,
	// 			}))
	// 		return allMessages.length > 0 ? [allMessages[allMessages.length - 1]] : []
	// 	},
	// 	[agent]
	// )

	// // Toast messages when they arrive
	// const lastToastedMessageRef = useRef<string>('')
	// useEffect(() => {
	// 	if (messages.length > 0) {
	// 		const msg = messages[0]
	// 		if (msg.complete && msg.text !== lastToastedMessageRef.current) {
	// 			lastToastedMessageRef.current = msg.text
	// 			toasts.addToast({
	// 				title: 'Fungal Network',
	// 				description: msg.text,
	// 			})
	// 		}
	// 	}
	// }, [messages, toasts])

	// Interaction Logic (Enter/Leave) - Using store subscription to detect any shape movements
	const shapesInsideRef = useRef<Set<TLShapeId>>(new Set())

	// Batching system for triggers - track enters and leaves separately
	const pendingEntersRef = useRef<Map<TLShapeId, TLShape>>(new Map())
	const pendingLeavesRef = useRef<Map<TLShapeId, TLShape>>(new Map())
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const countdownStartRef = useRef<number | null>(null)
	const [countdownProgress, setCountdownProgress] = useState<number>(0) // 0-COUNTDOWN_DURATION_MS
	const [pendingShapesCount, setPendingShapesCount] = useState<number>(0)
	const animationFrameRef = useRef<number | null>(null)

	// Helper to check if a shape is inside the network bounds
	const isShapeInsideBounds = useCallback(
		(shape: TLShape) => {
			const shapeBounds = editor.getShapePageBounds(shape)
			const networkBounds = new Box(network.x, network.y, network.w, network.h)
			return shapeBounds && networkBounds.contains(shapeBounds)
		},
		[editor, network.x, network.y, network.w, network.h]
	)

	// Function to batch trigger shapes
	const batchTrigger = useCallback(
		(shape: TLShape, triggerType: 'enter' | 'leave') => {
			if (!agent) return

			// Add shape to the appropriate pending batch (enter or leave)
			// Remove from the other batch if it exists there (shape can't both enter and leave)
			if (triggerType === 'enter') {
				pendingEntersRef.current.set(shape.id, shape)
				pendingLeavesRef.current.delete(shape.id)
			} else {
				pendingLeavesRef.current.set(shape.id, shape)
				pendingEntersRef.current.delete(shape.id)
			}

			const totalPending = pendingEntersRef.current.size + pendingLeavesRef.current.size
			setPendingShapesCount(totalPending)

			// Clear existing timeout if any
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
				timeoutRef.current = null
			}

			// Cancel any existing animation frame
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current)
				animationFrameRef.current = null
			}

			// Reset countdown
			const startTime = Date.now()
			countdownStartRef.current = startTime
			setCountdownProgress(COUNTDOWN_DURATION_MS)

			// Animation loop to update countdown progress
			const updateCountdown = () => {
				if (!countdownStartRef.current) {
					setCountdownProgress(0)
					return
				}

				const elapsed = Date.now() - countdownStartRef.current
				const remaining = Math.max(0, COUNTDOWN_DURATION_MS - elapsed)
				setCountdownProgress(remaining)

				if (remaining > 0) {
					animationFrameRef.current = requestAnimationFrame(updateCountdown)
				} else {
					setCountdownProgress(0)
					countdownStartRef.current = null
				}
			}
			animationFrameRef.current = requestAnimationFrame(updateCountdown)

			// Start/reset countdown
			timeoutRef.current = setTimeout(() => {
				// Get all pending shapes for enters and leaves
				const shapesEntered = Array.from(pendingEntersRef.current.values())
				const shapesLeft = Array.from(pendingLeavesRef.current.values())

				// Clear both batches
				pendingEntersRef.current.clear()
				pendingLeavesRef.current.clear()
				setPendingShapesCount(0)
				timeoutRef.current = null
				countdownStartRef.current = null
				setCountdownProgress(0)

				// Cancel animation frame
				if (animationFrameRef.current) {
					cancelAnimationFrame(animationFrameRef.current)
					animationFrameRef.current = null
				}

				// Trigger with all shapes, correctly identifying which entered and which left
				if (shapesEntered.length > 0 || shapesLeft.length > 0) {
					triggerFairy(agent, network, shapesEntered, shapesLeft)
				}
			}, COUNTDOWN_DURATION_MS)
		},
		[agent, network]
	)

	// Cleanup timeout and animation frame on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current)
			}
		}
	}, [])

	// Initialize the set of shapes inside the bounds
	useEffect(() => {
		const allShapes = editor.getCurrentPageShapes()
		const inside = new Set<TLShapeId>()
		for (const shape of allShapes) {
			if (isShapeInsideBounds(shape)) {
				inside.add(shape.id)
			}
		}
		shapesInsideRef.current = inside
	}, [editor, isShapeInsideBounds])

	useEffect(() => {
		if (!agent) return

		const unsubscribe = editor.store.listen(({ changes }) => {
			const networkBounds = new Box(network.x, network.y, network.w, network.h)

			// Check newly added shapes
			for (const record of Object.values(changes.added)) {
				if (!isShape(record)) continue
				const shapeBounds = editor.getShapePageBounds(record)
				if (shapeBounds && networkBounds.contains(shapeBounds)) {
					// Shape was created inside the bounds
					if (!shapesInsideRef.current.has(record.id)) {
						shapesInsideRef.current.add(record.id)
						if (network.triggerOn.includes('enter')) {
							batchTrigger(record, 'enter')
						}
					}
				}
			}

			// Check updated shapes for position changes
			for (const [_from, to] of Object.values(changes.updated)) {
				if (!isShape(to)) continue

				const wasInside = shapesInsideRef.current.has(to.id)
				const toBounds = editor.getShapePageBounds(to)
				const isNowInside = toBounds && networkBounds.contains(toBounds)

				if (!wasInside && isNowInside) {
					// Shape entered the bounds
					shapesInsideRef.current.add(to.id)
					if (network.triggerOn.includes('enter')) {
						batchTrigger(to, 'enter')
					}
				} else if (wasInside && !isNowInside) {
					// Shape left the bounds
					shapesInsideRef.current.delete(to.id)
					if (network.triggerOn.includes('leave')) {
						batchTrigger(to, 'leave')
					}
				}
			}

			// not atm
			// // Clean up removed shapes from tracking
			// for (const id of Object.keys(changes.removed)) {
			// 	if (shapesInsideRef.current.has(id as TLShapeId)) {
			// 		const wasInside = shapesInsideRef.current.has(id as TLShapeId)
			// 		shapesInsideRef.current.delete(id as TLShapeId)
			// 		// Optionally trigger leave when shape is deleted
			// 		if (wasInside && network.triggerOn === 'leave') {
			// 			batchTrigger(agent, network)
			// 		}
			// 	}
			// }
		})

		return () => {
			unsubscribe()
		}
	}, [editor, network, agent, batchTrigger])

	const updateNetwork = (patch: Partial<FungalNetworkState>) => {
		if (fairyApp) {
			fairyApp.fungalNetworks.updateNetwork(network.id, patch)
		}
	}

	const _removeNetwork = () => {
		if (fairyApp) {
			fairyApp.fungalNetworks.removeNetwork(network.id)
		}
	}

	return (
		<>
			<FungalNetworkToolbar network={network} updateNetwork={updateNetwork} />
			<FungalNetworkZone
				network={network}
				editor={editor}
				agent={agent}
				countdownProgress={countdownProgress}
				pendingShapesCount={pendingShapesCount}
			/>
		</>
	)
}

function FungalNetworkToolbar({
	network,
	updateNetwork,
}: {
	network: FungalNetworkState
	updateNetwork(patch: Partial<FungalNetworkState>): void
}) {
	const [isToolbarOpen, setIsToolbarOpen] = useState(true)
	const [isHovered, setIsHovered] = useState(false)
	const editor = useEditor()
	const { addDialog } = useDialogs()
	const dragStartRef = useRef<{ x: number; y: number; networkX: number; networkY: number } | null>(
		null
	)

	const handleDragStart = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			e.stopPropagation()
			const point = editor.screenToPage({ x: e.clientX, y: e.clientY })
			dragStartRef.current = {
				x: point.x,
				y: point.y,
				networkX: network.x,
				networkY: network.y,
			}
			editor.markEventAsHandled(e.nativeEvent)
			e.currentTarget.setPointerCapture(e.pointerId)
		},
		[editor, network.x, network.y]
	)

	const handleDragMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!dragStartRef.current) return
			e.stopPropagation()
			const point = editor.screenToPage({ x: e.clientX, y: e.clientY })
			const deltaX = point.x - dragStartRef.current.x
			const deltaY = point.y - dragStartRef.current.y
			updateNetwork({
				x: dragStartRef.current.networkX + deltaX,
				y: dragStartRef.current.networkY + deltaY,
			})
		},
		[editor, updateNetwork]
	)

	const handleDragEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (!dragStartRef.current) return
		e.stopPropagation()
		dragStartRef.current = null
		e.currentTarget.releasePointerCapture(e.pointerId)
	}, [])

	const handleOpenConfigDialog = useCallback(() => {
		addDialog({
			component: ({ onClose }: { onClose(): void }) => (
				<FungalNetworkConfigDialog
					network={network}
					updateNetwork={updateNetwork}
					onClose={onClose}
				/>
			),
		})
	}, [addDialog, network, updateNetwork])

	return (
		<div
			className="fungal-network-toolbar-wrapper"
			style={{
				top: network.y - 40, // Position above the zone
				left: network.x,
				width: network.w,
			}}
			onPointerDown={(e) => editor.markEventAsHandled(e.nativeEvent)}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{/* Drag handle - detached square at the left */}
			<div
				className="fungal-network-drag-handle"
				onPointerDown={handleDragStart}
				onPointerMove={handleDragMove}
				onPointerUp={handleDragEnd}
				onPointerCancel={handleDragEnd}
				title="Drag to move network"
			>
				<TldrawUiIcon icon="drag-handle-dots" label="Drag handle" small />
			</div>
			{isToolbarOpen ? (
				<div className="fungal-network-toolbar">
					{/* Configure button - appears on hover */}
					{isHovered && (
						<button
							className="fungal-network-config-button"
							onClick={(e) => {
								e.stopPropagation()
								handleOpenConfigDialog()
							}}
							onPointerDown={(e) => e.stopPropagation()}
							title="Configure zone"
						>
							<TldrawUiIcon icon="settings" label="Configure" small />
						</button>
					)}
				</div>
			) : (
				<div className="fungal-network-toolbar-closed">
					<button
						className="fungal-network-open-button"
						onClick={(e) => {
							e.stopPropagation()
							setIsToolbarOpen(true)
						}}
						onPointerDown={(e) => e.stopPropagation()}
						title="Open toolbar"
					>
						🍄
					</button>
				</div>
			)}
		</div>
	)
}

function FungalNetworkConfigDialog({
	network,
	updateNetwork,
	onClose,
}: {
	network: FungalNetworkState
	updateNetwork(patch: Partial<FungalNetworkState>): void
	onClose(): void
}) {
	const [localState, setLocalState] = useState<Partial<FungalNetworkState>>({
		x: network.x,
		y: network.y,
		w: network.w,
		h: network.h,
		prompt: network.prompt,
		triggerOn: [...network.triggerOn], // Create a copy of the array
	})

	const handleSave = useCallback(() => {
		updateNetwork(localState)
		onClose()
	}, [localState, updateNetwork, onClose])

	const handleCancel = useCallback(() => {
		onClose()
	}, [onClose])

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>Configure Zone</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className="fungal-network-config-dialog-body">
				<div className="fungal-network-config-form">
					{/* Position */}
					<div className="fungal-network-config-section">
						<label className="fungal-network-config-label">Position</label>
						<div className="fungal-network-config-row">
							<div className="fungal-network-config-field">
								<label className="fungal-network-config-field-label">X</label>
								<input
									type="number"
									className="fungal-network-config-input"
									value={localState.x}
									onChange={(e) =>
										setLocalState({ ...localState, x: parseFloat(e.target.value) || 0 })
									}
								/>
							</div>
							<div className="fungal-network-config-field">
								<label className="fungal-network-config-field-label">Y</label>
								<input
									type="number"
									className="fungal-network-config-input"
									value={localState.y}
									onChange={(e) =>
										setLocalState({ ...localState, y: parseFloat(e.target.value) || 0 })
									}
								/>
							</div>
						</div>
					</div>

					{/* Size */}
					<div className="fungal-network-config-section">
						<label className="fungal-network-config-label">Size</label>
						<div className="fungal-network-config-row">
							<div className="fungal-network-config-field">
								<label className="fungal-network-config-field-label">Width</label>
								<input
									type="number"
									className="fungal-network-config-input"
									value={localState.w}
									onChange={(e) =>
										setLocalState({ ...localState, w: parseFloat(e.target.value) || 0 })
									}
								/>
							</div>
							<div className="fungal-network-config-field">
								<label className="fungal-network-config-field-label">Height</label>
								<input
									type="number"
									className="fungal-network-config-input"
									value={localState.h}
									onChange={(e) =>
										setLocalState({ ...localState, h: parseFloat(e.target.value) || 0 })
									}
								/>
							</div>
						</div>
					</div>

					{/* Trigger */}
					<div className="fungal-network-config-section">
						<label className="fungal-network-config-label">Trigger</label>
						<div className="fungal-network-config-trigger-options">
							<label className="fungal-network-config-checkbox-label">
								<input
									type="checkbox"
									className="fungal-network-config-checkbox"
									checked={localState.triggerOn?.includes('enter') ?? false}
									onChange={(e) => {
										const currentTriggers: ('enter' | 'leave')[] = localState.triggerOn ?? []
										const newTriggers: ('enter' | 'leave')[] = e.target.checked
											? [...currentTriggers, 'enter']
											: currentTriggers.filter((t): t is 'enter' | 'leave' => t !== 'enter')
										setLocalState({ ...localState, triggerOn: newTriggers })
									}}
								/>
								<span>On Enter</span>
							</label>
							<label className="fungal-network-config-checkbox-label">
								<input
									type="checkbox"
									className="fungal-network-config-checkbox"
									checked={localState.triggerOn?.includes('leave') ?? false}
									onChange={(e) => {
										const currentTriggers: ('enter' | 'leave')[] = localState.triggerOn ?? []
										let newTriggers: ('enter' | 'leave')[]
										if (e.target.checked) {
											newTriggers = [...currentTriggers, 'leave']
										} else {
											newTriggers = currentTriggers.filter((t) => t !== 'leave') as (
												| 'enter'
												| 'leave'
											)[]
										}
										setLocalState({ ...localState, triggerOn: newTriggers })
									}}
								/>
								<span>On Leave</span>
							</label>
						</div>
					</div>

					{/* Prompt */}
					<div className="fungal-network-config-section">
						<label className="fungal-network-config-label">Prompt</label>
						<textarea
							className="fungal-network-config-textarea"
							value={localState.prompt}
							onChange={(e) => setLocalState({ ...localState, prompt: e.target.value })}
							placeholder="Describe what you see..."
							rows={4}
						/>
					</div>
				</div>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={handleCancel}>
					<TldrawUiButtonLabel>Cancel</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="primary" onClick={handleSave}>
					<TldrawUiButtonLabel>Save</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}

function FungalNetworkZone({
	network,
	editor,
	agent,
	countdownProgress: _countdownProgress,
	pendingShapesCount: _pendingShapesCount,
}: {
	network: FungalNetworkState
	editor: ReturnType<typeof useEditor>
	agent: FairyAgent | undefined
	countdownProgress: number
	pendingShapesCount: number
}) {
	const isGenerating = useValue('is-generating', () => agent?.requests.isGenerating() ?? false, [
		agent,
	])

	// const isCountdownActive = countdownProgress > 0
	// const progressPercent = (countdownProgress / COUNTDOWN_DURATION_MS) * 100

	return (
		<div
			// className={`fungal-network-container ${isGenerating ? 'fungal-network-container--generating' : ''}`}
			className="fungal-network-container"
			style={{
				position: 'absolute',
				top: network.y,
				left: network.x,
				width: network.w,
				height: network.h,
			}}
			onPointerDown={(e) => editor.markEventAsHandled(e.nativeEvent)}
		>
			{isGenerating && (
				<div className="fungal-network-spinner-container">
					<SmallSpinner />
				</div>
			)}
			{/* {isGenerating && (
				<svg
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: network.w,
						height: network.h,
						pointerEvents: 'none',
						overflow: 'visible',
					}}
					className="fungal-network-marching-ants-border"
				>
					<rect
						x="0"
						y="0"
						width={network.w}
						height={network.h}
						rx="8"
						ry="8"
						fill="none"
						stroke="#4caf50"
						strokeWidth="2"
						strokeDasharray="8 2"
						strokeLinecap="butt"
					/>
				</svg>
			)} */}
			{/* Debug countdown bar */}
			{/* {isCountdownActive && (
				<div
					style={{
						position: 'absolute',
						bottom: 0,
						left: 0,
						width: '100%',
						height: '4px',
						backgroundColor: 'rgba(0, 0, 0, 0.1)',
						borderRadius: '0 0 2px 2px',
						overflow: 'hidden',
					}}
				>
					<div
						style={{
							width: `${progressPercent}%`,
							height: '100%',
							backgroundColor: '#4CAF50',
							transition: 'width 0.05s linear',
						}}
					/>
				</div>
			)} */}
			{/* Debug info text */}
			{/* {isCountdownActive && (
				<div
					style={{
						position: 'absolute',
						top: '4px',
						right: '4px',
						fontSize: '10px',
						color: '#666',
						backgroundColor: 'rgba(255, 255, 255, 0.8)',
						padding: '2px 4px',
						borderRadius: '2px',
						fontFamily: 'monospace',
					}}
				>
					{Math.ceil(countdownProgress)}ms ({pendingShapesCount} shapes)
				</div>
			)} */}
		</div>
	)
}

function triggerFairy(
	agent: FairyAgent,
	network: FungalNetworkState,
	shapesEntered: TLShape[],
	shapesLeft: TLShape[]
) {
	const parts: string[] = []

	if (shapesEntered.length > 0) {
		const shapeIds = shapesEntered.map((shape) => convertTldrawIdToSimpleId(shape.id)).join(', ')
		const enterPrompt =
			shapesEntered.length === 1
				? `The shape ${shapeIds} just entered the zone.`
				: `The shapes ${shapeIds} just entered the zone.`
		parts.push(enterPrompt)
	}

	if (shapesLeft.length > 0) {
		const shapeIds = shapesLeft.map((shape) => convertTldrawIdToSimpleId(shape.id)).join(', ')
		const leavePrompt =
			shapesLeft.length === 1
				? `The shape ${shapeIds} just left the zone.`
				: `The shapes ${shapeIds} just left the zone.`
		parts.push(leavePrompt)
	}

	const shapePrompt = parts.join(' ')
	const zonePrompt = `Your instructions for monitoring your zone are: ${network.prompt}`
	agent.schedule({
		message: zonePrompt + '\n\n' + shapePrompt,
		bounds: {
			x: network.x,
			y: network.y,
			w: network.w,
			h: network.h,
		},
	})
}
