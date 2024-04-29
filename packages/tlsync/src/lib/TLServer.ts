import { nanoid } from 'nanoid'
import * as WebSocket from 'ws'
import { ServerSocketAdapter } from './ServerSocketAdapter'
import { RoomSnapshot, TLSyncRoom } from './TLSyncRoom'
import { JsonChunkAssembler } from './chunk'
import { schema } from './schema'
import { RoomState } from './server-types'

type LoadKind = 'reopen' | 'open' | 'room_not_found'
export type DBLoadResult =
	| {
			type: 'error'
			error?: Error | undefined
	  }
	| {
			type: 'room_found'
			snapshot: RoomSnapshot
	  }
	| {
			type: 'room_not_found'
	  }
export type DBLoadResultType = DBLoadResult['type']

export type TLServerEvent =
	| {
			type: 'client'
			name: 'room_create' | 'room_reopen' | 'enter' | 'leave' | 'last_out'
			roomId: string
			clientId: string
			instanceId: string
			localClientId: string
	  }
	| {
			type: 'room'
			name:
				| 'failed_load_from_db'
				| 'failed_persist_to_db'
				| 'room_empty'
				| 'fail_persist'
				| 'room_start'
			roomId: string
	  }
	| {
			type: 'send_message'
			roomId: string
			messageType: string
			messageLength: number
	  }

/**
 * This class manages rooms for a websocket server.
 *
 * @public
 */
export abstract class TLServer {
	schema = schema

	async getInitialRoomState(persistenceKey: string): Promise<[RoomState | undefined, LoadKind]> {
		let roomState = this.getRoomForPersistenceKey(persistenceKey)

		let roomOpenKind: LoadKind = 'open'

		// If no room exists for the id, create one
		if (roomState === undefined) {
			// Try to load a room from persistence
			if (this.loadFromDatabase) {
				const data = await this.loadFromDatabase(persistenceKey)
				if (data.type === 'error') {
					throw data.error
				}

				if (data.type === 'room_found') {
					roomOpenKind = 'reopen'

					roomState = {
						persistenceKey,
						room: new TLSyncRoom(this.schema, data.snapshot),
					}
				}
			}

			// If we still don't have a room, throw an error.
			if (roomState === undefined) {
				// This is how it bubbles down to the client:
				// 1.) From here, we send back a `room_not_found` to TLDrawDurableObject.
				// 2.) In TLDrawDurableObject, we accept and then immediately close the client.
				//   This lets us send a TLCloseEventCode.NOT_FOUND closeCode down to the client.
				// 3.) joinExistingRoom which handles the websocket upgrade is not affected.
				//   Again, we accept the connection, it's just that we immediately close right after.
				// 4.) In ClientWebSocketAdapter, ws.onclose is called, and that calls _handleDisconnect.
				// 5.) _handleDisconnect sets the status to 'error' and calls the onStatusChange callback.
				// 6.) On the dotcom app in useRemoteSyncClient, we have socket.onStatusChange callback
				//   where we set TLIncompatibilityReason.RoomNotFound and close the client + socket.
				// 7.) Finally on the dotcom app we use StoreErrorScreen to display an appropriate msg.
				//
				// Phew!
				return [roomState, 'room_not_found']
			}

			const thisRoom = roomState.room

			roomState.room.events.on('room_became_empty', async () => {
				// Record that the room is now empty
				const roomState = this.getRoomForPersistenceKey(persistenceKey)
				if (!roomState || roomState.room !== thisRoom) {
					// room was already closed
					return
				}
				this.logEvent({ type: 'room', roomId: persistenceKey, name: 'room_empty' })
				this.deleteRoomState(persistenceKey)
				roomState.room.close()

				try {
					await this.persistToDatabase?.(persistenceKey)
				} catch (err) {
					this.logEvent({ type: 'room', roomId: persistenceKey, name: 'fail_persist' })
					console.error('failed to save to storage', err)
				}
			})

			// persist on an interval...
			this.setRoomState(persistenceKey, roomState)

			// If we created a new room, then persist to the database again;
			// we may have run migrations or cleanup, so let's make sure that
			// the new data is put back into the database.
			this.persistToDatabase?.(persistenceKey)
		}

		return [roomState, roomOpenKind]
	}

	/**
	 * When a connection comes in, set up the client and event listeners for the client's room. The
	 * roomId is the websocket's protocol.
	 *
	 * @param ws - The client's websocket connection.
	 * @public
	 */
	handleConnection = async ({
		socket,
		persistenceKey,
		sessionKey,
		storeId,
	}: {
		socket: WebSocket.WebSocket
		persistenceKey: string
		sessionKey: string
		storeId: string
	}): Promise<DBLoadResultType> => {
		const clientId = nanoid()

		const [roomState, roomOpenKind] = await this.getInitialRoomState(persistenceKey)
		if (roomOpenKind === 'room_not_found' || !roomState) {
			return 'room_not_found'
		}

		roomState.room.handleNewSession(
			sessionKey,
			new ServerSocketAdapter({
				ws: socket,
				logSendMessage: (messageType, messageLength) =>
					this.logEvent({
						type: 'send_message',
						roomId: persistenceKey,
						messageType,
						messageLength,
					}),
			})
		)

		if (roomOpenKind === 'reopen') {
			// Record that the room is now active
			this.logEvent({ type: 'room', roomId: persistenceKey, name: 'room_start' })

			// Record what kind of room start event this is (why don't we extend the previous event? or even remove it?)
			this.logEvent({
				type: 'client',
				roomId: persistenceKey,
				name: 'room_reopen',
				clientId,
				instanceId: sessionKey,
				localClientId: storeId,
			})
		}

		// Record that the user entered the room
		this.logEvent({
			type: 'client',
			roomId: persistenceKey,
			name: 'enter',
			clientId,
			instanceId: sessionKey,
			localClientId: storeId,
		})

		// Handle a 'message' event from the server.
		const assembler = new JsonChunkAssembler()
		const handleMessageFromClient = (event: WebSocket.MessageEvent) => {
			try {
				if (typeof event.data === 'string') {
					const res = assembler.handleMessage(event.data)
					if (res?.data) {
						roomState.room.handleMessage(sessionKey, res.data as any)
					}
					if (res?.error) {
						console.warn('Error assembling message', res.error)
					}
				} else {
					console.warn('Unknown message type', typeof event.data)
				}
			} catch (e) {
				console.error(e)
				socket.send(JSON.stringify({ type: 'error', error: e }))
				socket.close(400)
			}
		}

		const handleCloseOrErrorFromClient = () => {
			// Remove the client from the room and delete associated user data.
			roomState?.room.handleClose(sessionKey)
		}

		const unsub = roomState.room.events.on('session_removed', async (ev) => {
			// Record who the last person to leave the room was
			if (sessionKey !== ev.sessionKey) return
			unsub()
			this.logEvent({
				type: 'client',
				roomId: persistenceKey,
				name: 'leave',
				clientId,
				instanceId: sessionKey,
				localClientId: storeId,
			})
			this.logEvent({
				type: 'client',
				roomId: persistenceKey,
				name: 'last_out',
				clientId,
				instanceId: sessionKey,
				localClientId: storeId,
			})

			socket.removeEventListener('message', handleMessageFromClient)
			socket.removeEventListener('close', handleCloseOrErrorFromClient)
			socket.removeEventListener('error', handleCloseOrErrorFromClient)
		})

		socket.addEventListener('message', handleMessageFromClient)
		socket.addEventListener('close', handleCloseOrErrorFromClient)
		socket.addEventListener('error', handleCloseOrErrorFromClient)

		return 'room_found'
	}

	/**
	 * Load data from a database. (Optional)
	 *
	 * @param roomId - The id of the room to load.
	 * @public
	 */
	abstract loadFromDatabase?(roomId: string): Promise<DBLoadResult>

	/**
	 * Persist data to a database. (Optional)
	 *
	 * @param roomId - The id of the room to load.
	 * @public
	 */
	abstract persistToDatabase?(roomId: string): Promise<void>

	/**
	 * Log an event. (Optional)
	 *
	 * @param event - The event to log.
	 * @public
	 */
	abstract logEvent(event: TLServerEvent): void

	/**
	 * Get a room by its id.
	 *
	 * @param persistenceKey - The id of the room to get.
	 * @public
	 */
	abstract getRoomForPersistenceKey(persistenceKey: string): RoomState | undefined

	/**
	 * Set a room to an id.
	 *
	 * @param persistenceKey - The id of the room to set.
	 * @param roomState - The room to set.
	 * @public
	 */
	abstract setRoomState(persistenceKey: string, roomState: RoomState): void

	/**
	 * Delete a room by its id.
	 *
	 * @param persistenceKey - The id of the room to delete.
	 * @public
	 */
	abstract deleteRoomState(persistenceKey: string): void
}
