import { times } from 'lodash'
import { Atom, atom, isAtom } from '../Atom'
import { Computed, computed, isComputed } from '../Computed'
import { Reactor, reactor } from '../EffectScheduler'
import { transact } from '../transactions'
import { Signal } from '../types'

class RandomSource {
	private seed: number

	constructor(seed: number) {
		this.seed = seed
	}

	nextFloat(): number {
		this.seed = (this.seed * 9301 + 49297) % 233280
		return this.seed / 233280
	}

	nextInt(max: number): number {
		return Math.floor(this.nextFloat() * max)
	}

	nextIntInRange(min: number, max: number): number {
		return this.nextInt(max - min) + min
	}

	nextId(): string {
		return this.nextInt(Number.MAX_SAFE_INTEGER).toString(36)
	}

	selectOne<T>(arr: readonly T[]): T {
		return arr[this.nextInt(arr.length)]
	}

	choice(probability: number): boolean {
		return this.nextFloat() < probability
	}

	executeOne<Result>(
		_choices: Record<string, (() => Result) | { weight?: number; do(): Result }>
	): Result {
		const choices = Object.values(_choices).map((choice) => {
			if (typeof choice === 'function') {
				return { weight: 1, do: choice }
			}
			return choice
		})
		const totalWeight = Object.values(choices).reduce(
			(total, choice) => total + (choice.weight ?? 1),
			0
		)
		const randomWeight = this.nextInt(totalWeight)
		let weight = 0
		for (const choice of Object.values(choices)) {
			weight += choice.weight ?? 1
			if (randomWeight < weight) {
				return choice.do()
			}
		}
		throw new Error('unreachable')
	}
}

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'] as const
type Letter = (typeof LETTERS)[number]

const unpack = (value: unknown): Letter => {
	if (isComputed(value) || isAtom(value)) {
		return unpack(value.get()) as Letter
	}
	return value as Letter
}

interface FuzzSystemState {
	atoms: Record<string, Atom<Letter>>
	atomsInAtoms: Record<string, Atom<Atom<Letter>>>
	derivations: Record<string, { derivation: Computed<Letter>; sneakyGet: () => Letter }>
	derivationsInDerivations: Record<string, Computed<Computed<Letter>>>
	atomsInDerivations: Record<string, Computed<Atom<Letter>>>
	reactors: Record<string, { reactor: Reactor; result: string | null; dependencies: Signal<any>[] }>
}

type Op =
	| { type: 'update_atom'; id: string; value: Letter }
	| { type: 'update_atom_in_atom'; id: string; atomId: string }
	| { type: 'deref_derivation'; id: string }
	| { type: 'deref_derivation_in_derivation'; id: string }
	| { type: 'deref_atom_in_derivation'; id: string }
	| { type: 'run_several_ops_in_transaction'; ops: Op[] }
	| { type: 'start_reactor'; id: string }
	| { type: 'stop_reactor'; id: string }

const MAX_ATOMS = 10
const MAX_ATOMS_IN_ATOMS = 10
const MAX_DERIVATIONS = 10
const MAX_DERIVATIONS_IN_DERIVATIONS = 10
const MAX_ATOMS_IN_DERIVATIONS = 10
const MAX_REACTORS = 10
const MAX_DEPENDENCIES_PER_ATOM = 3
const MAX_OPS_IN_TRANSACTION = 10

class Test {
	source: RandomSource
	systemState: FuzzSystemState = {
		atoms: {},
		atomsInAtoms: {},
		derivations: {},
		derivationsInDerivations: {},
		atomsInDerivations: {},
		reactors: {},
	}

	unpack_sneaky = (value: unknown): Letter => {
		if (isComputed(value)) {
			if (this.systemState.derivations[value.name]) {
				return this.systemState.derivations[value.name].sneakyGet()
			}
			// @ts-expect-error
			return this.unpack_sneaky(value.state) as Letter
		} else if (isAtom(value)) {
			// @ts-expect-error
			return this.unpack_sneaky(value.current) as Letter
		}
		return value as Letter
	}

	getResultComparisons() {
		const result: { expected: Record<string, string>; actual: Record<string, string | null> } = {
			expected: {},
			actual: {},
		}
		for (const [reactorId, { reactor, result: actualResult, dependencies }] of Object.entries(
			this.systemState.reactors
		)) {
			if (!reactor.scheduler.isActivelyListening) continue
			result.expected[reactorId] = dependencies.map(this.unpack_sneaky).join(':')
			result.actual[reactorId] = actualResult
		}

		return result
	}

	constructor(seed: number) {
		this.source = new RandomSource(seed)

		times(this.source.nextIntInRange(1, MAX_ATOMS), () => {
			const atomId = this.source.nextId()
			this.systemState.atoms[atomId] = atom(atomId, this.source.selectOne(LETTERS))
		})

		times(this.source.nextIntInRange(1, MAX_ATOMS_IN_ATOMS), () => {
			const atomId = this.source.nextId()
			this.systemState.atomsInAtoms[atomId] = atom(
				atomId,
				this.source.selectOne(Object.values(this.systemState.atoms))
			)
		})

		times(this.source.nextIntInRange(1, MAX_ATOMS_IN_DERIVATIONS), () => {
			const derivationId = this.source.nextId()
			const atom = this.source.selectOne(Object.values(this.systemState.atoms))
			this.systemState.atomsInDerivations[derivationId] = computed(derivationId, () => atom)
		})

		times(this.source.nextIntInRange(1, MAX_DERIVATIONS), () => {
			const derivationId = this.source.nextId()
			const derivables = [
				...Object.values(this.systemState.atoms),
				...Object.values(this.systemState.atomsInAtoms),
				...Object.values(this.systemState.atomsInDerivations),
				...Object.values(this.systemState.derivations),
			]
			const inputA = this.source.selectOne(derivables)
			const inputB = this.source.selectOne(derivables)
			const inputC = this.source.selectOne(derivables)
			const inputD = this.source.selectOne(derivables)
			this.systemState.derivations[derivationId] = {
				derivation: computed(derivationId, () => {
					if (unpack(inputA) === unpack(inputB)) {
						return unpack(inputC)
					} else {
						return unpack(inputD)
					}
				}),
				sneakyGet: () => {
					if (this.unpack_sneaky(inputA) === this.unpack_sneaky(inputB)) {
						return this.unpack_sneaky(inputC)
					} else {
						return this.unpack_sneaky(inputD)
					}
				},
			}
		})

		times(this.source.nextIntInRange(1, MAX_DERIVATIONS_IN_DERIVATIONS), () => {
			const derivationId = this.source.nextId()
			this.systemState.derivationsInDerivations[derivationId] = computed(derivationId, () =>
				this.source.selectOne(Object.values(this.systemState.derivations).map((d) => d.derivation))
			)
		})

		times(this.source.nextIntInRange(1, MAX_REACTORS), () => {
			const reactorId = this.source.nextId()
			const dependencies: Signal<any>[] = []

			times(this.source.nextIntInRange(1, MAX_DEPENDENCIES_PER_ATOM), () => {
				this.source.executeOne({
					'add a random atom': () => {
						dependencies.push(this.source.selectOne(Object.values(this.systemState.atoms)))
					},
					'add a random atom in atom': () => {
						dependencies.push(this.source.selectOne(Object.values(this.systemState.atomsInAtoms)))
					},
					'add a random derivation': () => {
						dependencies.push(
							this.source.selectOne(
								Object.values(this.systemState.derivations).map((d) => d.derivation)
							)
						)
					},
					'add a random derivation in derivation': () => {
						dependencies.push(
							this.source.selectOne(Object.values(this.systemState.derivationsInDerivations))
						)
					},
					'add a random atom in derivation': () => {
						dependencies.push(
							this.source.selectOne(Object.values(this.systemState.atomsInDerivations))
						)
					},
				})
				dependencies.push(this.source.selectOne(Object.values(this.systemState.atoms)))
			})

			this.systemState.reactors[reactorId] = {
				reactor: reactor(reactorId, () => {
					this.systemState.reactors[reactorId].result = dependencies.map(unpack).join(':')
				}),
				result: '',
				dependencies,
			}
		})
	}

	readonly ops: Op[] = []

	getNextOp(): Op {
		return this.source.executeOne<Op>({
			'update atom': () => {
				return {
					type: 'update_atom',
					id: this.source.selectOne(Object.keys(this.systemState.atoms)),
					value: this.source.selectOne(LETTERS),
				}
			},
			'update atom in atom': () => {
				return {
					type: 'update_atom_in_atom',
					id: this.source.selectOne(Object.keys(this.systemState.atomsInAtoms)),
					atomId: this.source.selectOne(Object.keys(this.systemState.atoms)),
				}
			},
			'deref atom in derivation': () => {
				return {
					type: 'deref_atom_in_derivation',
					id: this.source.selectOne(Object.keys(this.systemState.atomsInDerivations)),
				}
			},
			'deref derivation in derivation': () => {
				return {
					type: 'deref_derivation_in_derivation',
					id: this.source.selectOne(Object.keys(this.systemState.derivationsInDerivations)),
				}
			},
			'deref derivation': () => {
				return {
					type: 'deref_derivation',
					id: this.source.selectOne(Object.keys(this.systemState.derivations)),
				}
			},
			'run several ops in a transaction': () => {
				return {
					type: 'run_several_ops_in_transaction',
					ops: times(this.source.nextIntInRange(2, MAX_OPS_IN_TRANSACTION), () => this.getNextOp()),
				}
			},
			start_reactor: () => {
				return {
					type: 'start_reactor',
					id: this.source.selectOne(Object.keys(this.systemState.reactors)),
				}
			},
			stop_reactor: () => {
				return {
					type: 'stop_reactor',
					id: this.source.selectOne(Object.keys(this.systemState.reactors)),
				}
			},
		})
	}

	applyOp(op: Op) {
		switch (op.type) {
			case 'update_atom': {
				this.systemState.atoms[op.id].set(op.value)
				break
			}
			case 'deref_atom_in_derivation': {
				this.systemState.atomsInDerivations[op.id].get()
				break
			}
			case 'deref_derivation': {
				this.systemState.derivations[op.id].derivation.get()
				break
			}
			case 'deref_derivation_in_derivation': {
				this.systemState.derivationsInDerivations[op.id].get()
				break
			}
			case 'update_atom_in_atom': {
				this.systemState.atomsInAtoms[op.id].set(this.systemState.atoms[op.atomId])
				break
			}
			case 'run_several_ops_in_transaction': {
				transact(() => {
					op.ops.forEach((op) => this.applyOp(op))
				})
				break
			}
			case 'start_reactor': {
				this.systemState.reactors[op.id].reactor.start()
				break
			}
			case 'stop_reactor': {
				this.systemState.reactors[op.id].reactor.stop()
				break
			}
			default: {
				throw new Error(`Unknown op type: ${op}`)
			}
		}
	}

	tick() {
		const op = this.getNextOp()
		this.ops.push(op)
		this.applyOp(op)
	}
}

const NUM_TESTS = 20
const NUM_OPS_PER_TEST = 1000

function runTest(seed: number) {
	const test = new Test(seed)
	for (let i = 0; i < NUM_OPS_PER_TEST; i++) {
		test.tick()
		const { expected, actual } = test.getResultComparisons()
		expect(expected).toEqual(actual)
	}
}

for (let i = 0; i < NUM_TESTS; i++) {
	const seed = Math.floor(Math.random() * 1000000)
	test('fuzzzzzz ' + seed, () => {
		runTest(seed)
	})
}

test('regression 728608', () => {
	runTest(728608)
})
