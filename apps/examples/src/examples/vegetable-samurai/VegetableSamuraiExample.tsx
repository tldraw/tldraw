import { useCallback, useEffect, useRef, useState } from 'react'
import {
	BaseBoxShapeUtil,
	Geometry2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
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
const GAME_DURATION = 60 // seconds
const VEGETABLE_SPAWN_INTERVAL = 1000 // milliseconds
const GRAVITY = 0.5
const INITIAL_VELOCITY_Y = -15
const INITIAL_VELOCITY_X_RANGE = 8
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const GROUND_Y = CANVAS_HEIGHT - 50

// Vegetable types with their properties
const VEGETABLE_TYPES = {
	tomato: { emoji: '🍅', color: '#ff4444', points: 10, size: 60 },
	carrot: { emoji: '🥕', color: '#ff8800', points: 15, size: 50 },
	broccoli: { emoji: '🥦', color: '#44ff44', points: 20, size: 55 },
	corn: { emoji: '🌽', color: '#ffff44', points: 12, size: 65 },
	eggplant: { emoji: '🍆', color: '#8844ff', points: 18, size: 58 },
	pepper: { emoji: '🌶️', color: '#ff2222', points: 25, size: 45 },
} as const

type VegetableType = keyof typeof VEGETABLE_TYPES

// Vegetable shape definition
type VegetableShape = TLBaseShape<
	'vegetable',
	{
		w: number
		h: number
		vegetableType: VegetableType
		velocityX: number
		velocityY: number
		isSliced: boolean
		sliceAngle: number
		juiceParticles: Array<{ x: number; y: number; vx: number; vy: number; life: number }>
		createdAt: number
	}
>

// Juice particle shape
type JuiceParticleShape = TLBaseShape<
	'juice-particle',
	{
		w: number
		h: number
		color: string
		life: number
		velocityX: number
		velocityY: number
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
		juiceParticles: T.array,
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
			juiceParticles: [],
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
		const veggie = VEGETABLE_TYPES[shape.props.vegetableType]
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
				{/* Juice particles */}
				{shape.props.juiceParticles.map((particle, i) => (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: particle.x,
							top: particle.y,
							width: 4,
							height: 4,
							backgroundColor: veggie.color,
							borderRadius: '50%',
							opacity: particle.life / 100,
							pointerEvents: 'none',
						}}
					/>
				))}
			</HTMLContainer>
		)
	}

	indicator(shape: VegetableShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

// Sword tool for slicing
class SwordTool extends StateNode {
	static override id = 'sword'
	private trailPoints: Vec[] = []
	private isSlicing = false

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown(info: TLPointerEventInfo) {
		this.isSlicing = true
		this.trailPoints = [info.point]
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (!this.isSlicing) return

		this.trailPoints.push(info.point)
		if (this.trailPoints.length > 10) {
			this.trailPoints.shift()
		}

		// Check for vegetable collisions along the trail
		this.checkVegetableSlicing(info.point)

		// Create sword trail effect
		this.createSwordTrail()
	}

	override onPointerUp() {
		this.isSlicing = false
		this.trailPoints = []
	}

	private checkVegetableSlicing(point: Vec) {
		const vegetables = this.editor
			.getCurrentPageShapes()
			.filter((shape) => shape.type === 'vegetable') as VegetableShape[]

		vegetables.forEach((vegetable) => {
			if (vegetable.props.isSliced) return

			const bounds = this.editor.getShapeGeometry(vegetable).bounds
			const shapeCenter = Vec.Add(
				{ x: vegetable.x, y: vegetable.y },
				{ x: bounds.width / 2, y: bounds.height / 2 }
			)

			// Check if sword trail intersects with vegetable
			if (Vec.Dist(point, shapeCenter) < bounds.width / 2) {
				this.sliceVegetable(vegetable, point)
			}
		})
	}

	private sliceVegetable(vegetable: VegetableShape, slicePoint: Vec) {
		const veggie = VEGETABLE_TYPES[vegetable.props.vegetableType]
		
		// Create juice particles
		const juiceParticles = Array.from({ length: 8 }, () => ({
			x: Math.random() * 20 - 10,
			y: Math.random() * 20 - 10,
			vx: (Math.random() - 0.5) * 10,
			vy: (Math.random() - 0.5) * 10,
			life: 100,
		}))

		// Update vegetable to sliced state
		this.editor.updateShape<VegetableShape>({
			id: vegetable.id,
			type: 'vegetable',
			props: {
				...vegetable.props,
				isSliced: true,
				sliceAngle: Math.random() * 360,
				juiceParticles,
			},
		})

		// Trigger game score update
		window.dispatchEvent(
			new CustomEvent('vegetableSliced', {
				detail: { points: veggie.points, type: vegetable.props.vegetableType },
			})
		)

		// Create juice splash effect
		this.createJuiceSplash(slicePoint, veggie.color)
	}

	private createJuiceSplash(point: Vec, color: string) {
		// Create multiple juice particle shapes
		for (let i = 0; i < 6; i++) {
			const particleId = createShapeId()
			this.editor.createShape({
				id: particleId,
				type: 'juice-particle',
				x: point.x + (Math.random() - 0.5) * 20,
				y: point.y + (Math.random() - 0.5) * 20,
				props: {
					w: 8,
					h: 8,
					color,
					life: 100,
					velocityX: (Math.random() - 0.5) * 8,
					velocityY: (Math.random() - 0.5) * 8,
				},
			})
		}
	}

	private createSwordTrail() {
		// Visual sword trail effect using temporary shapes
		if (this.trailPoints.length < 2) return

		const lastPoint = this.trailPoints[this.trailPoints.length - 1]
		const secondLastPoint = this.trailPoints[this.trailPoints.length - 2]

		// Create a temporary line shape for the trail
		const trailId = createShapeId()
		this.editor.createShape({
			id: trailId,
			type: 'line',
			x: secondLastPoint.x,
			y: secondLastPoint.y,
			props: {
				points: [
					{ x: 0, y: 0 },
					{ x: lastPoint.x - secondLastPoint.x, y: lastPoint.y - secondLastPoint.y },
				],
				color: 'blue',
				size: 'm',
			},
		})

		// Remove trail after short delay
		setTimeout(() => {
			try {
				this.editor.deleteShape(trailId)
			} catch (e) {
				// Shape might already be deleted
			}
		}, 100)
	}
}

// Juice particle shape util
class JuiceParticleShapeUtil extends BaseBoxShapeUtil<JuiceParticleShape> {
	static override type = 'juice-particle' as const
	static override props: RecordProps<JuiceParticleShape> = {
		w: T.number,
		h: T.number,
		color: T.string,
		life: T.number,
		velocityX: T.number,
		velocityY: T.number,
	}

	getDefaultProps(): JuiceParticleShape['props'] {
		return {
			w: 8,
			h: 8,
			color: '#ff4444',
			life: 100,
			velocityX: 0,
			velocityY: 0,
		}
	}

	override canEdit() {
		return false
	}
	override canResize() {
		return false
	}

	component(shape: JuiceParticleShape) {
		return (
			<HTMLContainer
				style={{
					width: shape.props.w,
					height: shape.props.h,
					backgroundColor: shape.props.color,
					borderRadius: '50%',
					opacity: shape.props.life / 100,
					pointerEvents: 'none',
				}}
			/>
		)
	}

	indicator(shape: JuiceParticleShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

// Game UI Component
function GameUI({ score, timeLeft, combo, isGameActive, onStart, onRestart }: {
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
export default function VegetableSamuraiExample() {
	const [score, setScore] = useState(0)
	const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
	const [combo, setCombo] = useState(1)
	const [isGameActive, setIsGameActive] = useState(false)
	const gameLoopRef = useRef<number>()
	const spawnIntervalRef = useRef<number>()
	const editorRef = useRef<any>()

	// Custom shapes and tools
	const customShapeUtils = [VegetableShapeUtil, JuiceParticleShapeUtil]
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
				if (shape.type === 'vegetable' || shape.type === 'juice-particle') {
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
			if (!isGameActive) return

			const vegetableTypes = Object.keys(VEGETABLE_TYPES) as VegetableType[]
			const randomType = vegetableTypes[Math.floor(Math.random() * vegetableTypes.length)]
			const veggie = VEGETABLE_TYPES[randomType]

			const vegetableId = createShapeId()
			const startX = Math.random() * (CANVAS_WIDTH - 100) + 50
			const velocityX = (Math.random() - 0.5) * INITIAL_VELOCITY_X_RANGE
			const velocityY = INITIAL_VELOCITY_Y + Math.random() * -5

			if (editorRef.current) {
				editorRef.current.createShape({
					id: vegetableId,
					type: 'vegetable',
					x: startX,
					y: GROUND_Y,
					props: {
						w: veggie.size,
						h: veggie.size,
						vegetableType: randomType,
						velocityX,
						velocityY,
						isSliced: false,
						sliceAngle: 0,
						juiceParticles: [],
						createdAt: Date.now(),
					},
				})
			}
		}

		spawnIntervalRef.current = window.setInterval(spawnVegetables, VEGETABLE_SPAWN_INTERVAL)

		// Game physics loop
		const gameLoop = () => {
			if (!editorRef.current || !isGameActive) return

			const shapes = editorRef.current.getCurrentPageShapes()
			const vegetables = shapes.filter((shape: any) => shape.type === 'vegetable')
			const juiceParticles = shapes.filter((shape: any) => shape.type === 'juice-particle')

			// Update vegetables
			vegetables.forEach((vegetable: VegetableShape) => {
				const newVelocityY = vegetable.props.velocityY + GRAVITY
				const newX = vegetable.x + vegetable.props.velocityX
				const newY = vegetable.y + newVelocityY

				// Remove vegetables that fall off screen or are too old
				if (newY > CANVAS_HEIGHT + 100 || Date.now() - vegetable.props.createdAt > 10000) {
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

			// Update juice particles
			juiceParticles.forEach((particle: JuiceParticleShape) => {
				const newLife = particle.props.life - 2
				if (newLife <= 0) {
					editorRef.current.deleteShape(particle.id)
					return
				}

				const newX = particle.x + particle.props.velocityX
				const newY = particle.y + particle.props.velocityY + GRAVITY * 0.5

				editorRef.current.updateShape({
					id: particle.id,
					type: 'juice-particle',
					x: newX,
					y: newY,
					props: {
						...particle.props,
						life: newLife,
						velocityY: particle.props.velocityY + GRAVITY * 0.5,
					},
				})
			})

			gameLoopRef.current = requestAnimationFrame(gameLoop)
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
					// Set up canvas
					editor.zoomToFit()
					editor.setCamera({ x: 0, y: 0, z: 1 })
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