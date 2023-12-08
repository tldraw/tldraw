import {
	Editor,
	Signal,
	TLPointerEventInfo,
	TLPointerEventName,
	Vec2d,
	Vec2dModel,
	atom,
	computed,
	useEditor,
} from '@tldraw/tldraw'
import { useEffect, useState } from 'react'
import { Spring } from './lib/Spring'

export class Agent implements PromiseLike<undefined> {
	readonly editor: Editor
	readonly #x = new Spring({ target: 0 })
	readonly #y = new Spring({ target: 0 })
	readonly #isPointerDown = atom('isPointerDown', false)

	constructor(public readonly hostEditor: Editor) {
		this.editor = new Editor(hostEditor.opts)
	}

	#queue = Promise.resolve()
	private enqueue<T>(fn: () => Promise<T> | T) {
		return new Promise<T>((resolve, reject) => {
			this.#queue = this.#queue.then(async () => {
				try {
					const result = await fn()
					resolve(result)
				} catch (err) {
					reject(err)
				}
			})
		})
	}

	// stick an `await` before any agent command to wait until it's completed its point in the queue
	then<TResult1 = undefined, TResult2 = never>(
		onfulfilled?: ((value: undefined) => TResult1 | PromiseLike<TResult1>) | null | undefined,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined
	): PromiseLike<TResult1 | TResult2> {
		// @ts-expect-error
		return this.#queue.then(onfulfilled, onrejected)
	}

	#nextFramePromise: Promise<number> | null = null
	start() {
		let resolveNextFrame!: (value: number) => void
		this.#nextFramePromise = new Promise((resolve) => {
			resolveNextFrame = resolve
		})

		const tick = (t: number) => {
			this.#x.tick()
			this.#y.tick()
			resolveNextFrame(t)
			this.#nextFramePromise = new Promise((resolve) => {
				resolveNextFrame = resolve
			})
		}
		this.editor.on('tick', tick)
		return () => {
			this.editor.off('tick', tick)
		}
	}
	private nextFrame() {
		if (!this.#nextFramePromise) {
			throw new Error('Agent is not started')
		}
		return this.#nextFramePromise
	}

	isPointerDown(): boolean {
		return this.#isPointerDown.get()
	}
	pointer(): Vec2dModel {
		return {
			x: this.#x.getValue(),
			y: this.#y.getValue(),
		}
	}

	setCurrentTool(tool: string): this {
		this.enqueue(() => this.editor.setCurrentTool(tool))
		return this
	}

	pointerDown(): this
	pointerDown(x: number, y: number): this
	pointerDown(point: Vec2dModel): this
	pointerDown(point: () => Vec2dModel): this
	pointerDown(...args: PointArgs): this {
		this.enqueue(async () => {
			const target = this.argsToVec2dSignal(args)
			await this.moveCursorTo(target)
			if (!this.isPointerDown()) {
				this.#isPointerDown.set(true)
				this.editor.dispatch(
					this.createPointerEvent('pointer_down', { x: target.x.get(), y: target.y.get() })
				)
			}
		})
		return this
	}

	pointerMove(x: number, y: number): this
	pointerMove(point: Vec2dModel): this
	pointerMove(point: () => Vec2dModel): this
	pointerMove(...args: PointArgs): this {
		this.enqueue(async () => {
			const target = this.argsToVec2dSignal(args)
			await this.moveCursorTo(target)
		})
		return this
	}

	pointerUp(): this
	pointerUp(x: number, y: number): this
	pointerUp(point: Vec2dModel): this
	pointerUp(point: () => Vec2dModel): this
	pointerUp(...args: PointArgs): this {
		this.enqueue(async () => {
			const target = this.argsToVec2dSignal(args)
			await this.moveCursorTo(target)
			if (this.isPointerDown()) {
				this.#isPointerDown.set(false)
				this.editor.dispatch(
					this.createPointerEvent('pointer_up', { x: target.x.get(), y: target.y.get() })
				)
			}
		})
		return this
	}

	private async moveCursorTo(target: Vec2dSignal) {
		this.#x.setTarget(target.x)
		this.#y.setTarget(target.y)

		do {
			const currentTargetPosition = { x: this.#x.getValue(), y: this.#y.getValue() }
			const distance = new Vec2d(this.#x.getValue(), this.#y.getValue()).dist(currentTargetPosition)
			const isAtTarget = distance < 1
			if (isAtTarget) {
				this.editor.dispatch(this.createPointerEvent('pointer_move', currentTargetPosition))
				break
			} else {
				this.editor.dispatch(
					this.createPointerEvent('pointer_move', { x: this.#x.getValue(), y: this.#y.getValue() })
				)
			}
		} while (await this.nextFrame())
	}

	private argsToVec2dSignal(args: PointArgs): Vec2dSignal {
		if (args.length === 0) {
			return {
				x: atom('x', this.#x.getValue()),
				y: atom('y', this.#y.getValue()),
			}
		} else if (args.length === 1) {
			const arg = args[0]
			if (typeof arg === 'function') {
				return {
					x: computed('x', () => arg().x),
					y: computed('y', () => arg().y),
				}
			} else {
				return {
					x: atom('x', arg.x),
					y: atom('y', arg.y),
				}
			}
		} else {
			return {
				x: atom('x', args[0]),
				y: atom('y', args[1]),
			}
		}
	}

	private createPointerEvent(
		name: TLPointerEventName,
		target: Vec2dModel
		// options?: Omit<Partial<TLPointerEventInfo>, 'type' | 'point'>
	): TLPointerEventInfo {
		return {
			type: 'pointer',
			name,
			point: target,
			pointerId: 1,
			shiftKey: false,
			ctrlKey: false,
			altKey: false,
			button: 0,
			isPen: false,
			target: 'canvas',
			// ...options,
		}
	}
}

type PointArgs = [] | [number, number] | [Vec2dModel] | [() => Vec2dModel]
type Vec2dSignal = { x: Signal<number>; y: Signal<number> }

export function useAgent() {
	const editor = useEditor()
	const [currentAgent, setAgent] = useState<null | Agent>(null)

	useEffect(() => {
		const agent = new Agent(editor)
		setAgent(agent)
	}, [editor])

	useEffect(() => {
		return currentAgent?.start()
	}, [currentAgent])

	return currentAgent
}
