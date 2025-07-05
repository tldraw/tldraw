import { useCallback, useEffect, useRef, useState } from 'react'
import {
	BaseBoxShapeUtil,
	HTMLContainer,
	RecordProps,
	StateNode,
	T,
	TLBaseShape,
	TLPointerEventInfo,
	Tldraw,
	Vec,
	createShapeId,
} from 'tldraw'
import 'tldraw/tldraw.css'

// Game constants
const GAME_DURATION = 60
const VEGETABLE_SPAWN_INTERVAL = 1000
const GRAVITY = 0.5
const INITIAL_VELOCITY_Y = -15
const INITIAL_VELOCITY_X_RANGE = 8

// Vegetable types
const VEGETABLE_TYPES = {
	tomato: { emoji: '🍅', color: '#ff4444', points: 10, size: 60 },
	carrot: { emoji: '🥕', color: '#ff8800', points: 15, size: 50 },
	broccoli: { emoji: '🥦', color: '#44ff44', points: 20, size: 55 },
	corn: { emoji: '🌽', color: '#ffff44', points: 12, size: 65 },
	eggplant: { emoji: '🍆', color: '#8844ff', points: 18, size: 58 },
	pepper: { emoji: '🌶️', color: '#ff2222', points: 25, size: 45 },
} as const

type VegetableType = keyof typeof VEGETABLE_TYPES

// Vegetable shape
type VegetableShape = TLBaseShape<
	'vegetable',
	{
		w: number
		h: number
		vegetableType: string
		velocityX: number
		velocityY: number
		isSliced: boolean
		sliceAngle: number
		createdAt: number
	}
>

// Vegetable shape util
class VegetableShapeUtil extends BaseBoxShapeUtil<VegetableShape> {
	static override type = 'vegetable' as const
	static override props: RecordProps<VegetableShape> = {
		w: T.number,
		h: T.number,
		vegetableType: T.string,
		velocityX: T.number,
		velocityY: T.number,
		isSliced: T.boolean,
		sliceAngle: T.number,
		createdAt: T.number,
	}

	getDefaultProps(): VegetableShape['props'] {
		return {
			w: 60,
			h: 60,
			vegetableType: 'tomato',
			velocityX: 0,
			velocityY: 0,
			isSliced: false,
			sliceAngle: 0,
			createdAt: Date.now(),
		}
	}

	override canEdit() {
		return false
	}
	override canResize() {
		return false
	}

	component(shape: VegetableShape) {
		const veggie = VEGETABLE_TYPES[shape.props.vegetableType as VegetableType] || VEGETABLE_TYPES.tomato
		const rotation = shape.props.isSliced ? shape.props.sliceAngle : 0

		return (
			<HTMLContainer
				style={{
					width: shape.props.w,
					height: shape.props.h,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: shape.props.w * 0.8,
					transform: `rotate(${rotation}deg)`,
					transition: shape.props.isSliced ? 'transform 0.3s ease-out' : 'none',
					filter: shape.props.isSliced ? 'blur(1px) brightness(0.7)' : 'none',
					pointerEvents: 'none',
				}}
			>
				{veggie.emoji}
			</HTMLContainer>
		)
	}

	indicator(shape: VegetableShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

// Sword tool
class SwordTool extends StateNode {
	static override id = 'sword'
	private isSlicing = false

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown(info: TLPointerEventInfo) {
		this.isSlicing = true
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (!this.isSlicing) return

		// Simple collision detection
		const point = info.point
		const vegetables = this.editor
			.getCurrentPageShapes()
			.filter((shape) => shape.type === 'vegetable') as VegetableShape[]

		vegetables.forEach((vegetable) => {
			if (vegetable.props.isSliced) return

			const bounds = this.editor.getShapeGeometry(vegetable).bounds
			const shapeCenter = {
				x: vegetable.x + bounds.width / 2,
				y: vegetable.y + bounds.height / 2,
			}

			const distance = Math.sqrt(
				Math.pow(point.x - shapeCenter.x, 2) + Math.pow(point.y - shapeCenter.y, 2)
			)

			if (distance < bounds.width / 2) {
				this.sliceVegetable(vegetable)
			}
		})
	}

	override onPointerUp() {
		this.isSlicing = false
	}

	private sliceVegetable(vegetable: VegetableShape) {
		const veggie = VEGETABLE_TYPES[vegetable.props.vegetableType as VegetableType] || VEGETABLE_TYPES.tomato

		// Update vegetable to sliced state
		this.editor.updateShape<VegetableShape>({
			id: vegetable.id,
			type: 'vegetable',
			props: {
				...vegetable.props,
				isSliced: true,
				sliceAngle: Math.random() * 360,
			},
		})

		// Trigger game score update
		window.dispatchEvent(
			new CustomEvent('vegetableSliced', {
				detail: { points: veggie.points, type: vegetable.props.vegetableType },
			})
		)
	}
}

// Game UI
function GameUI({ 
	score, 
	timeLeft, 
	combo, 
	isGameActive, 
	onStart, 
	onRestart 
}: {
	score: number
	timeLeft: number
	combo: number
	isGameActive: boolean
	onStart: () => void
	onRestart: () => void
}) {
	return (
		<div
			style={{
				position: 'absolute',
				top: 20,
				left: 20,
				right: 20,
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				background: 'rgba(0, 0, 0, 0.8)',
				color: 'white',
				padding: '16px 24px',
				borderRadius: 12,
				fontSize: 18,
				fontWeight: 'bold',
				zIndex: 1000,
				pointerEvents: 'none',
			}}
		>
			<div>Score: {score}</div>
			<div>Time: {timeLeft}s</div>
			<div>Combo: x{combo}</div>
			<div style={{ pointerEvents: 'all' }}>
				{!isGameActive ? (
					<button
						onClick={onStart}
						style={{
							padding: '8px 16px',
							background: '#4CAF50',
							color: 'white',
							border: 'none',
							borderRadius: 6,
							cursor: 'pointer',
							fontSize: 16,
						}}
					>
						Start Game
					</button>
				) : (
					<button
						onClick={onRestart}
						style={{
							padding: '8px 16px',
							background: '#f44336',
							color: 'white',
							border: 'none',
							borderRadius: 6,
							cursor: 'pointer',
							fontSize: 16,
						}}
					>
						Restart
					</button>
				)}
			</div>
		</div>
	)
}

// Main game component
export default function VegetableSamuraiSimple() {
	const [score, setScore] = useState(0)
	const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
	const [combo, setCombo] = useState(1)
	const [isGameActive, setIsGameActive] = useState(false)
	const gameLoopRef = useRef<number>()
	const spawnIntervalRef = useRef<number>()
	const editorRef = useRef<any>()

	const customShapeUtils = [VegetableShapeUtil]
	const customTools = [SwordTool]

	const startGame = useCallback(() => {
		setIsGameActive(true)
		setScore(0)
		setTimeLeft(GAME_DURATION)
		setCombo(1)

		// Clear existing shapes
		if (editorRef.current) {
			const allShapes = editorRef.current.getCurrentPageShapes()
			allShapes.forEach((shape: any) => {
				if (shape.type === 'vegetable') {
					editorRef.current.deleteShape(shape.id)
				}
			})
		}

		// Start game timer
		const gameTimer = setInterval(() => {
			setTimeLeft((prev) => {
				if (prev <= 1) {
					setIsGameActive(false)
					clearInterval(gameTimer)
					return 0
				}
				return prev - 1
			})
		}, 1000)

		// Start vegetable spawning
		const spawnVegetables = () => {
			const vegetableTypes = Object.keys(VEGETABLE_TYPES) as VegetableType[]
			const randomType = vegetableTypes[Math.floor(Math.random() * vegetableTypes.length)]
			const veggie = VEGETABLE_TYPES[randomType]

			const vegetableId = createShapeId()
			const startX = Math.random() * 600 + 100
			const velocityX = (Math.random() - 0.5) * INITIAL_VELOCITY_X_RANGE
			const velocityY = INITIAL_VELOCITY_Y + Math.random() * -5

			if (editorRef.current) {
				editorRef.current.createShape({
					id: vegetableId,
					type: 'vegetable',
					x: startX,
					y: 500,
					props: {
						w: veggie.size,
						h: veggie.size,
						vegetableType: randomType,
						velocityX,
						velocityY,
						isSliced: false,
						sliceAngle: 0,
						createdAt: Date.now(),
					},
				})
			}
		}

		spawnIntervalRef.current = window.setInterval(spawnVegetables, VEGETABLE_SPAWN_INTERVAL)

		// Game physics loop
		const gameLoop = () => {
			if (!editorRef.current) return

			const shapes = editorRef.current.getCurrentPageShapes()
			const vegetables = shapes.filter((shape: any) => shape.type === 'vegetable')

			vegetables.forEach((vegetable: VegetableShape) => {
				const newVelocityY = vegetable.props.velocityY + GRAVITY
				const newX = vegetable.x + vegetable.props.velocityX
				const newY = vegetable.y + newVelocityY

				// Remove vegetables that fall off screen
				if (newY > 700 || Date.now() - vegetable.props.createdAt > 10000) {
					editorRef.current.deleteShape(vegetable.id)
					return
				}

				// Update vegetable position
				editorRef.current.updateShape({
					id: vegetable.id,
					type: 'vegetable',
					x: newX,
					y: newY,
					props: {
						...vegetable.props,
						velocityY: newVelocityY,
					},
				})
			})

			if (isGameActive) {
				gameLoopRef.current = requestAnimationFrame(gameLoop)
			}
		}

		gameLoopRef.current = requestAnimationFrame(gameLoop)
	}, [isGameActive])

	const restartGame = useCallback(() => {
		setIsGameActive(false)
		if (gameLoopRef.current) {
			cancelAnimationFrame(gameLoopRef.current)
		}
		if (spawnIntervalRef.current) {
			clearInterval(spawnIntervalRef.current)
		}
		setTimeout(startGame, 100)
	}, [startGame])

	// Handle vegetable slicing events
	useEffect(() => {
		const handleVegetableSliced = (event: CustomEvent) => {
			const { points } = event.detail
			setScore((prev) => prev + points * combo)
			setCombo((prev) => Math.min(prev + 1, 10))
		}

		window.addEventListener('vegetableSliced', handleVegetableSliced as EventListener)
		return () => {
			window.removeEventListener('vegetableSliced', handleVegetableSliced as EventListener)
		}
	}, [combo])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (gameLoopRef.current) {
				cancelAnimationFrame(gameLoopRef.current)
			}
			if (spawnIntervalRef.current) {
				clearInterval(spawnIntervalRef.current)
			}
		}
	}, [])

	// Reset combo when no slicing for a while
	useEffect(() => {
		const resetCombo = setTimeout(() => {
			setCombo(1)
		}, 3000)

		return () => clearTimeout(resetCombo)
	}, [combo])

	return (
		<div className="tldraw__editor" style={{ position: 'relative', height: '100vh' }}>
			<GameUI
				score={score}
				timeLeft={timeLeft}
				combo={combo}
				isGameActive={isGameActive}
				onStart={startGame}
				onRestart={restartGame}
			/>
			<Tldraw
				shapeUtils={customShapeUtils}
				tools={customTools}
				initialState="sword"
				hideUi
				onMount={(editor) => {
					editorRef.current = editor
					editor.zoomToFit()
				}}
			/>
			<div
				style={{
					position: 'absolute',
					bottom: 20,
					left: '50%',
					transform: 'translateX(-50%)',
					background: 'rgba(0, 0, 0, 0.8)',
					color: 'white',
					padding: '12px 24px',
					borderRadius: 8,
					fontSize: 14,
					textAlign: 'center',
					pointerEvents: 'none',
				}}
			>
				🗡️ Slice the vegetables with your sword! 🥕🍅🥦
				<br />
				<small>Drag to slice • Build combos for higher scores!</small>
			</div>
		</div>
	)
}