/* eslint-disable no-console */
// Generic provider-agnostic arrow handler. Listens to tldraw binding events
// and dispatches into the relevant provider adapter(s).
//
//   - Two endpoints on the same provider → adapter.addWithinProviderLink
//   - Two endpoints across providers     → adapter.addReference (both sides)
//
// Adapters are registered at boot via registerAdapter().

import type { ExternalEntity, ProviderAdapter } from './types'

const adapters: ProviderAdapter[] = []

export function registerAdapter(adapter: ProviderAdapter) {
	adapters.push(adapter)
}

export function listAdapters(): readonly ProviderAdapter[] {
	return adapters
}

/** Returns the (adapter, entity) for whichever adapter owns the shape, if any. */
export function findEntity(
	shapeId: string
): { adapter: ProviderAdapter; entity: ExternalEntity } | null {
	for (const a of adapters) {
		const entity = a.entityForShapeId(shapeId)
		if (entity) return { adapter: a, entity }
	}
	return null
}

// ---- Arrow binding accumulator ----------------------------------------------

// tldraw arrows have two binding records (start + end) that arrive separately
// over the webhook stream. We buffer them per arrow id and act once both
// resolve to entities.

interface ArrowBinding {
	id: string
	fromId: string // arrow shape id
	toId: string // bound shape id
	props: { terminal?: 'start' | 'end' }
}

interface ArrowEndpoints {
	start?: ArrowBinding
	end?: ArrowBinding
}

const pending = new Map<string, ArrowEndpoints>()

// Arrow id → the references it created, so we can undo on delete.
interface WiredArrow {
	from: { providerId: string; entity: ExternalEntity }
	to: { providerId: string; entity: ExternalEntity }
}
const wired = new Map<string, WiredArrow>()

export function clearArrowState() {
	pending.clear()
	wired.clear()
}

export function wiredArrowIds(): string[] {
	return [...wired.keys()]
}

export async function handleBindingCreated(binding: ArrowBinding) {
	const arrowId = binding.fromId
	const terminal = binding.props.terminal ?? 'end'
	const slot = pending.get(arrowId) ?? {}
	slot[terminal] = binding
	pending.set(arrowId, slot)

	if (!slot.start || !slot.end) return

	const from = findEntity(slot.start.toId)
	const to = findEntity(slot.end.toId)
	if (!from || !to || from.entity.shapeId === to.entity.shapeId) return

	try {
		if (from.adapter.providerId === to.adapter.providerId) {
			if (from.adapter.addWithinProviderLink) {
				console.log(
					`arrow ${arrowId}: ${from.adapter.providerId} parent→child ` +
						`${from.entity.externalId} → ${to.entity.externalId}`
				)
				await from.adapter.addWithinProviderLink(from.entity as any, to.entity as any)
			}
		} else {
			console.log(
				`arrow ${arrowId}: cross-ref ${from.adapter.providerId}:${from.entity.externalId}` +
					` ↔ ${to.adapter.providerId}:${to.entity.externalId}`
			)
			if (from.adapter.addReference) await from.adapter.addReference(from.entity, to.entity)
			if (to.adapter.addReference) await to.adapter.addReference(to.entity, from.entity)
		}
		wired.set(arrowId, {
			from: { providerId: from.adapter.providerId, entity: from.entity },
			to: { providerId: to.adapter.providerId, entity: to.entity },
		})
	} catch (e) {
		console.warn('failed to wire arrow:', e)
	}
}

export async function handleBindingDeleted(bindingId: string) {
	for (const [arrowId, slot] of pending) {
		if (slot.start?.id !== bindingId && slot.end?.id !== bindingId) continue
		pending.delete(arrowId)
		const w = wired.get(arrowId)
		if (!w) continue
		wired.delete(arrowId)
		try {
			const fromAdapter = adapters.find((a) => a.providerId === w.from.providerId)
			const toAdapter = adapters.find((a) => a.providerId === w.to.providerId)
			if (w.from.providerId === w.to.providerId) {
				if (fromAdapter?.removeWithinProviderLink) {
					await fromAdapter.removeWithinProviderLink(w.from.entity as any, w.to.entity as any)
				}
			} else {
				if (fromAdapter?.removeReference) await fromAdapter.removeReference(w.from.entity, w.to.entity)
				if (toAdapter?.removeReference) await toAdapter.removeReference(w.to.entity, w.from.entity)
			}
		} catch (e) {
			console.warn('failed to unwire arrow:', e)
		}
	}
}
