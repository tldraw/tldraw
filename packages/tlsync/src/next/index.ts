import { assert, exhaustiveSwitchError } from '@tldraw/utils'

type ClientName = 'Alice' | 'Bob' | 'Charlie' | 'Dave' | 'Erin' | 'Frank'
type ServerName = 'Server'
type Name = ClientName | ServerName

type Packet = any

type Envelope = {
	from: Name
	to: Name
	packet: Packet
}

type Event =
	| {
			type: 'client.setStore'
			client: ClientName
			store: Store
	  }
	| {
			type: 'client.connect'
			client: ClientName
	  }
	| {
			type: 'client.action'
			client: ClientName
			action: ClientAction
			args: [number, number]
	  }
	| {
			type: 'network.allowPacket'
			from: Name
			to: Name
	  }
	| {
			type: 'network.dropPacket'
			from: Name
			to: Name
	  }

type Scenario = {
	clientNames: Array<ClientName>
	events: Array<Event>
}

class Runtime {
	clientRegistry: Map<ClientName, Client> = new Map()
	connectedClients: Array<ClientName> = []
	server: Server

	buffers: Map<[Name, Name], Array<Envelope>> = new Map()

	constructor(clientNames: Array<ClientName>) {
		const serverContext = new ServerContext(this)
		this.server = new Server(serverContext)

		clientNames.forEach((name) => {
			this.buffers.set([name, 'Server'], [])
			this.buffers.set(['Server', name], [])

			const clientContext = new ClientContext(this, name)
			const client = new Client(clientContext)
			this.clientRegistry.set(name, client)
		})
	}

	send(envelope: Envelope) {
		this.buffers.get([envelope.from, envelope.to])!.push(envelope)
	}
}

export function execute(scenario: Scenario): Map<Name, Store> {
	const runtime = new Runtime(scenario.clientNames)

	for (const event of scenario.events) {
		switch (event.type) {
			case 'client.setStore': {
				const client = runtime.clientRegistry.get(event.client)!
				client.store = event.store
				break
			}
			case 'client.connect': {
				assert(!runtime.connectedClients.includes(event.client), 'client is already connected')
				runtime.connectedClients.push(event.client)
				break
			}
			case 'client.action': {
				const client = runtime.clientRegistry.get(event.client)!
				client[event.action](...event.args)
				break
			}
			case 'network.allowPacket': {
				const buffer = runtime.buffers.get([event.from, event.to])!
				const envelope = buffer.shift()
				if (!envelope) break
				if (event.to === 'Server') {
					assert(envelope.from !== 'Server', 'Server cannot send packets to itself')
					runtime.server.onPacket(envelope.from, envelope.packet)
				} else {
					runtime.clientRegistry.get(event.to)!.onPacket(envelope.packet)
				}
				break
			}
			case 'network.dropPacket': {
				const buffer = runtime.buffers.get([event.from, event.to])!
				buffer.shift()
				break
			}
			default:
				throw exhaustiveSwitchError(event)
		}
	}

	const result: Map<Name, Store> = new Map()
	result.set('Server', runtime.server.store)
	for (const [name, client] of runtime.clientRegistry) {
		result.set(name, client.store)
	}
	return result
}

class Store {
	data: Array<{ id: string; property: number }> = []

	mutations = {
		add_square: (id: string, size: number) => {
			this.data.push({ id, property: size })
		},
	}
}

class ServerContext {
	runtime: Runtime

	constructor(runtime: Runtime) {
		this.runtime = runtime
	}

	getConnectedClients(): Array<ClientName> {
		return this.runtime.connectedClients
	}

	broadcast(packet: Packet) {
		for (const client of this.getConnectedClients()) {
			this.runtime.send({ from: 'Server', to: client, packet })
		}
	}
}

export class Server {
	context: ServerContext
	store: Store = new Store()

	constructor(context: ServerContext) {
		this.context = context
	}

	onPacket(from: ClientName, packet: Packet) {
		this.context.broadcast(packet)
	}
}

class ClientContext {
	runtime: Runtime
	name: ClientName

	constructor(runtime: Runtime, name: ClientName) {
		this.runtime = runtime
		this.name = name
	}

	sendToServer(packet: Packet) {
		this.runtime.send({ from: this.name, to: 'Server', packet })
	}
}

export type ClientAction = 'drawSquare'

export class Client {
	store: Store = new Store()
	context: ClientContext

	constructor(context: ClientContext) {
		this.context = context
	}

	drawSquare(id: number, size: number) {
		this.store.mutations.add_square(`square:${id}`, size)
		// consider not failing here
		this.context.sendToServer(this.store)
	}

	onPacket(packet: Packet) {
		this.store = packet
	}
}
