import { defineMigrations, SerializedStore } from '@tldraw/store'
import { deepCopy } from '@tldraw/utils'
import { TLArrowBinding } from './bindings/TLArrowBinding'
import { Vec2dModel } from './misc/geometry-types'
import { createBindingId } from './records/TLBinding'
import { TLRecord } from './records/TLRecord'
import { TLShapeId } from './records/TLShape'
import { TLArrowShape } from './shapes/TLArrowShape'

const Versions = {
	RemoveCodeAndIconShapeTypes: 1,
	AddInstancePresenceType: 2,
	RemoveTLUserAndPresenceAndAddPointer: 3,
	RemoveUserDocument: 4,
	ExtractArrowBindings: 5,
} as const

export { Versions as storeVersions }

type OldArrowTerminal =
	| {
			type: 'point'
			x: number
			y: number
	  }
	| {
			type: 'binding'
			boundShapeId: TLShapeId
			normalizedAnchor: Vec2dModel
			isExact: boolean
			isPrecise: boolean
	  }

/** @public */
export const storeMigrations = defineMigrations({
	currentVersion: Versions.ExtractArrowBindings,
	migrators: {
		[Versions.RemoveCodeAndIconShapeTypes]: {
			up: (store: SerializedStore<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(
						([_, v]) => v.typeName !== 'shape' || (v.type !== 'icon' && v.type !== 'code')
					)
				)
			},
			down: (store: SerializedStore<TLRecord>) => {
				// noop
				return store
			},
		},
		[Versions.AddInstancePresenceType]: {
			up: (store: SerializedStore<TLRecord>) => {
				return store
			},
			down: (store: SerializedStore<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(([_, v]) => v.typeName !== 'instance_presence')
				)
			},
		},
		[Versions.RemoveTLUserAndPresenceAndAddPointer]: {
			up: (store: SerializedStore<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(([_, v]) => !v.typeName.match(/^(user|user_presence)$/))
				)
			},
			down: (store: SerializedStore<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(([_, v]) => v.typeName !== 'pointer')
				)
			},
		},
		[Versions.RemoveUserDocument]: {
			up: (store: SerializedStore<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(([_, v]) => !v.typeName.match('user_document'))
				)
			},
			down: (store: SerializedStore<TLRecord>) => {
				return store
			},
		},
		[Versions.ExtractArrowBindings]: {
			up: (store: SerializedStore<TLRecord>) => {
				const arrows = Object.values(store).filter(
					(r) => r.typeName === 'shape' && r.type === 'arrow'
				) as TLArrowShape[]
				const bindings: TLArrowBinding[] = []
				for (const arrow of arrows) {
					const { start, end } = arrow.props as any as {
						start: OldArrowTerminal
						end: OldArrowTerminal
					}
					if (start.type === 'binding') {
						bindings.push({
							id: createBindingId(`${arrow.id}:arrow-start`),
							typeName: 'binding',
							type: 'arrow',
							meta: {},
							fromShapeId: arrow.id,
							toShapeId: start.boundShapeId,
							props: {
								isExact: start.isExact,
								isPrecise: start.isPrecise,
								normalizedAnchor: start.normalizedAnchor,
								terminal: 'start',
							},
						})
					}
					if (end.type === 'binding') {
						bindings.push({
							id: createBindingId(`${arrow.id}:arrow-end`),
							typeName: 'binding',
							type: 'arrow',
							meta: {},
							fromShapeId: arrow.id,
							toShapeId: end.boundShapeId,
							props: {
								isExact: end.isExact,
								isPrecise: end.isPrecise,
								normalizedAnchor: end.normalizedAnchor,
								terminal: 'end',
							},
						})
					}
				}
				// the arrows will be updated by the arrow migration
				return {
					...store,
					...Object.fromEntries(bindings.map((b) => [b.id, b])),
				}
			},
			down: (store: SerializedStore<TLRecord>) => {
				const bindings = Object.values(store).filter(
					(r) => r.typeName === 'binding' && r.type === 'arrow'
				) as TLArrowBinding[]
				const withoutBindings = Object.fromEntries(
					Object.entries(store).filter(([_, v]) => !bindings.includes(v as TLArrowBinding))
				)
				for (const binding of bindings) {
					const arrow = deepCopy(withoutBindings[binding.fromShapeId]) as TLArrowShape
					if (binding.props.terminal === 'start') {
						const start = {
							type: 'binding',
							boundShapeId: binding.toShapeId,
							isExact: binding.props.isExact,
							isPrecise: binding.props.isPrecise,
							normalizedAnchor: binding.props.normalizedAnchor,
						} satisfies OldArrowTerminal
						arrow.props.start = start as any
					} else {
						const end = {
							type: 'binding',
							boundShapeId: binding.toShapeId,
							isExact: binding.props.isExact,
							isPrecise: binding.props.isPrecise,
							normalizedAnchor: binding.props.normalizedAnchor,
						} satisfies OldArrowTerminal
						arrow.props.end = end as any
					}
					withoutBindings[binding.fromShapeId] = arrow
				}
				return withoutBindings
			},
		},
	},
})
