import { EventListener, EventName, MidiEvent } from './types'

// Anything that emits or receives events is identified by its object identity,
// just like the EventBusDelegate pointers in the C++ source.
export type EventBusDelegate = object

type ListenerMap = Map<number, EventListener>
type Listeners = Map<EventName, ListenerMap>

/**
 * Central publish/subscribe hub. A direct port of kaneel/midiseq's EventBus:
 * listeners are keyed by (delegate, eventName) and dispatch snapshots so that
 * handlers can safely mutate subscriptions while an event is in flight.
 */
export class EventBus {
	private delegates = new Map<EventBusDelegate, Listeners>()
	private nextId = 1

	register(delegate: EventBusDelegate) {
		if (!this.delegates.has(delegate)) {
			this.delegates.set(delegate, new Map())
		}
	}

	addListener(delegate: EventBusDelegate, event: EventName, listener: EventListener): number {
		let listeners = this.delegates.get(delegate)
		if (!listeners) {
			listeners = new Map()
			this.delegates.set(delegate, listeners)
		}
		let slot = listeners.get(event)
		if (!slot) {
			slot = new Map()
			listeners.set(event, slot)
		}
		const id = this.nextId++
		slot.set(id, listener)
		return id
	}

	removeListener(delegate: EventBusDelegate, event: EventName, id: number) {
		const listeners = this.delegates.get(delegate)
		if (!listeners) return
		const slot = listeners.get(event)
		if (!slot) return
		slot.delete(id)
	}

	dispatchEvent(delegate: EventBusDelegate, event: MidiEvent) {
		const listeners = this.delegates.get(delegate)
		if (!listeners) return
		const slot = listeners.get(event.name)
		if (!slot) return
		// Snapshot before calling so listeners can add/remove during dispatch.
		const snapshot = Array.from(slot.values())
		for (const listener of snapshot) {
			listener(event.data)
		}
	}

	unregister(delegate: EventBusDelegate) {
		this.delegates.delete(delegate)
	}
}
