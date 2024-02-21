// import { Client, Server } from './index'
//
// test('state convergence', () => {
// 	const server = new Server()
// 	const client1 = new Client(server)
// 	const client2 = new Client(server)
//
// 	client1.drawSquare(1, 5)
//
// 	const expectedState = [{ id: 'square:1', property: 5 }]
//
// 	expect(client1.store.data).toStrictEqual(expectedState)
// 	expect(server.store.data).toStrictEqual(expectedState)
// 	expect(client2.store.data).toStrictEqual(expectedState)
// })
//
// test('scenario', () => {
// 	const scenario = {
// 		clientNames: ['Alice', 'Bob'],
// 		events: [
// 			{ type: 'client.setStore', client: 'Alice', store: [{ id: 'square:0', property: 5 }] },
// 			{ type: 'client.connect', client: 'Alice' },
// 			{ type: 'client.connect', client: 'Bob' },
// 			{ type: 'client.action', action: 'drawSquare', args: [1, 5] },
// 			{ type: 'network.allowPacket', from: 'Alice', to: 'Server' },
// 			{ type: 'network.dropPacket', from: 'Alice', to: 'Server' },
// 		],
// 	}
// })
