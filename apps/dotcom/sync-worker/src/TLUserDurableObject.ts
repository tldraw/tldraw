import {
	OptimisticAppStore,
	ROOM_PREFIX,
	TlaFile,
	TlaFileState,
	TlaUser,
	ZClientSentMessage,
	ZErrorCode,
	ZEvent,
	ZRowUpdate,
	ZServerSentMessage,
	ZTable,
} from '@tldraw/dotcom-shared'
import { assert } from '@tldraw/utils'
import { createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { IRequest, Router } from 'itty-router'
import postgres from 'postgres'
import type { EventHint } from 'toucan-js/node_modules/@sentry/types'
import { type TLPostgresReplicator } from './TLPostgresReplicator'
import { getR2KeyForRoom } from './r2'
import { Environment } from './types'
import { getCurrentSerializedRoomSnapshot } from './utils/tla/getCurrentSerializedRoomSnapshot'

export class TLUserDurableObject extends DurableObject<Environment> {
	db: ReturnType<typeof postgres>
	replicator: TLPostgresReplicator
	store = new OptimisticAppStore()

	sentry
	captureException(exception: unknown, eventHint?: EventHint) {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		this.sentry?.captureException(exception, eventHint) as any
		if (!this.sentry) {
			console.error(exception)
		}
	}

	constructor(ctx: DurableObjectState, env: Environment) {
		super(ctx, env)

		this.sentry = createSentry(ctx, env)
		this.replicator = this.env.TL_PG_REPLICATOR.get(
			this.env.TL_PG_REPLICATOR.idFromName('0')
		) as any as TLPostgresReplicator

		this.db = postgres(env.BOTCOM_POSTGRES_CONNECTION_STRING)
	}

	userId: string | null = null

	readonly router = Router()
		.all('/app/:userId/*', async (req) => {
			if (!this.userId) {
				this.userId = req.params.userId
			}
			await this.ctx.blockConcurrencyWhile(async () => {
				this.store.initialize(await this.replicator.fetchDataForUser(this.userId!))
			})
		})
		.get(`/app/:userId/connect`, (req) => this.onRequest(req))

	// Handle a request to the Durable Object.
	override async fetch(req: IRequest) {
		const sentry = createSentry(this.ctx, this.env, req)
		try {
			return await this.router.fetch(req)
		} catch (err) {
			if (sentry) {
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				sentry?.captureException(err)
			} else {
				console.error(err)
			}
			return new Response('Something went wrong', {
				status: 500,
				statusText: 'Internal Server Error',
			})
		}
	}

	async onRequest(req: IRequest) {
		// handle legacy param names

		const url = new URL(req.url)
		const params = Object.fromEntries(url.searchParams.entries())
		const { sessionId } = params

		if (!this.userId) {
			throw new Error('User data not initialized')
		}
		if (!sessionId) {
			throw new Error('Session ID is required')
		}

		// Create the websocket pair for the client
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
		this.ctx.acceptWebSocket(serverWebSocket)
		const initialData = this.store.getCommitedData()
		if (!initialData) {
			throw new Error('Initial data not fetched')
		}

		// todo: sync
		serverWebSocket.send(
			JSON.stringify({
				type: 'initial_data',
				initialData,
			} satisfies ZServerSentMessage)
		)

		return new Response(null, { status: 101, webSocket: clientWebSocket })
	}

	override async webSocketMessage(ws: WebSocket, message: string) {
		const msg = JSON.parse(message) as any as ZClientSentMessage
		switch (msg.type) {
			case 'mutate':
				await this.handleMutate(msg)
				break
			default:
				this.captureException(new Error('Unhandled message'), { data: { message } })
		}
	}

	async commitMutation(mutationNumber: number) {
		const mutationIds = this.mutations
			.filter((m) => m.mutationNumber <= mutationNumber)
			.map((m) => m.mutationId)
		this.mutations = this.mutations.filter((m) => m.mutationNumber > mutationNumber)
		this.store.commitMutations(mutationIds)
		for (const socket of this.ctx.getWebSockets()) {
			socket.send(
				JSON.stringify({
					type: 'commit',
					mutationIds,
				} satisfies ZServerSentMessage)
			)
		}
	}

	async rejectMutation(mutationId: string, errorCode: ZErrorCode) {
		this.store.rejectMutation(mutationId)
		for (const socket of this.ctx.getWebSockets()) {
			socket.send(
				JSON.stringify({
					type: 'reject',
					mutationId,
					errorCode,
				} satisfies ZServerSentMessage)
			)
		}
	}

	mutations: { mutationNumber: number; mutationId: string }[] = []

	async assertValidMutation(update: ZRowUpdate) {
		// s is the entire set of data that the user has access to
		// and is up to date with all committed mutations so far.
		// we commit each mutation one at a time before handling the next.
		const s = this.store.getFullData()
		if (!s) {
			// This should never happen
			throw new ZMutationError(ZErrorCode.unknown_error, 'Store data not fetched')
		}
		switch (update.table) {
			case 'user': {
				const isUpdatingSelf = (update.row as TlaUser).id === this.userId
				if (!isUpdatingSelf)
					throw new ZMutationError(
						ZErrorCode.forbidden,
						'Cannot update user record that is not our own'
					)
				// todo: prevent user from updating their email?
				return
			}
			case 'file': {
				const nextFile = update.row as TlaFile
				const prevFile = s.files.find((f) => f.id === (update.row as any).id)
				if (!prevFile) {
					const isOwner = nextFile.ownerId === this.userId
					if (isOwner) return
					throw new ZMutationError(
						ZErrorCode.forbidden,
						`Cannot create a file for another user ${nextFile.id}`
					)
				}
				if (nextFile.ownerId === this.userId) return
				if (prevFile.shared && prevFile.sharedLinkType === 'edit') return
				throw new ZMutationError(
					ZErrorCode.forbidden,
					'Cannot update file that is not our own and not shared in edit mode'
				)
			}
			case 'file_state': {
				const nextFileState = update.row as TlaFileState
				let file = s.files.find((f) => f.id === nextFileState.fileId)
				if (!file) {
					// The user might not have access to this file yet, because they just followed a link
					// let's allow them to create a file state for it if it exists and is shared.
					file = (await this.replicator.getFileRecord(nextFileState.fileId)) ?? undefined
				}
				if (!file) {
					throw new ZMutationError(ZErrorCode.bad_request, `File not found ${nextFileState.fileId}`)
				}
				if (file.ownerId === this.userId) return
				if (file.shared) return

				throw new ZMutationError(
					ZErrorCode.forbidden,
					"Cannot update file state of file we don't own and is not shared"
				)
			}
		}
	}

	async handleMutate(msg: ZClientSentMessage) {
		try {
			;(await this.db.begin(async (sql) => {
				for (const update of msg.updates) {
					await this.assertValidMutation(update)
					switch (update.event) {
						case 'insert': {
							if (update.table === 'file_state') {
								const { fileId: _fileId, userId: _userId, ...rest } = update.row as any
								if (Object.keys(rest).length === 0) {
									await sql`insert into ${sql('public.' + update.table)} ${sql(update.row)} ON CONFLICT ("fileId", "userId") DO NOTHING`
								} else {
									await sql`insert into ${sql('public.' + update.table)} ${sql(update.row)} ON CONFLICT ("fileId", "userId") DO UPDATE SET ${sql(rest)}`
								}
								break
							} else {
								const { id: _id, ...rest } = update.row as any
								await sql`insert into ${sql('public.' + update.table)} ${sql(update.row)} ON CONFLICT ("id") DO UPDATE SET ${sql(rest)}`
								break
							}
						}
						case 'update':
							if (update.table === 'file_state') {
								const { fileId, userId, ...rest } = update.row as any
								await sql`update public.file_state set ${sql(rest)} where "fileId" = ${fileId} and "userId" = ${userId}`
							} else {
								const { id, ...rest } = update.row as any
								await sql`update ${sql('public.' + update.table)} set ${sql(rest)} where id = ${id}`
								if (update.table === 'file') {
									const currentFile = this.store.getFullData()?.files.find((f) => f.id === id)
									if (currentFile && currentFile.published !== rest.published) {
										if (rest.published) {
											await this.publishSnapshot(currentFile)
										} else {
											await this.unpublishSnapshot(currentFile)
										}
									} else if (
										currentFile &&
										currentFile.published &&
										currentFile.lastPublished < rest.lastPublished
									) {
										await this.publishSnapshot(currentFile)
									}
								}
							}
							break
						case 'delete':
							if (update.table === 'file_state') {
								const { fileId, userId } = update.row as any
								await sql`delete from public.file_state where "fileId" = ${fileId} and "userId" = ${userId}`
							} else {
								const { id } = update.row as any
								await sql`delete from ${sql('public.' + update.table)} where id = ${id}`
							}
							if (update.table === 'file') {
								const { id } = update.row as TlaFile
								await this.deleteFileStuff(id)
							}
							break
					}
					this.store.updateOptimisticData([update], msg.mutationId)
				}
			})) as any

			// TODO: We should probably handle a case where the above operation succeeds but the one below fails
			const result = await this
				.db`insert into public.user_mutation_number ("userId", "mutationNumber") values (${this.userId}, 1) on conflict ("userId") do update set "mutationNumber" = user_mutation_number."mutationNumber" + 1 returning "mutationNumber"`
			const mutationNumber = Number(result[0].mutationNumber)
			const currentMutationNumber = this.mutations.at(-1)?.mutationNumber ?? 0
			assert(
				mutationNumber > currentMutationNumber,
				`mutation number did not increment mutationNumber: ${mutationNumber} current: ${currentMutationNumber}`
			)
			this.mutations.push({ mutationNumber, mutationId: msg.mutationId })
		} catch (e) {
			const code = e instanceof ZMutationError ? e.errorCode : ZErrorCode.unknown_error
			this.captureException(e, {
				data: { errorCode: code, reason: 'mutation failed' },
			})
			this.rejectMutation(msg.mutationId, code)
		}
	}

	onRowChange(row: object, table: ZTable, event: ZEvent) {
		this.store.updateCommittedData({ table, event, row })
		for (const socket of this.ctx.getWebSockets()) {
			socket.send(
				JSON.stringify({
					type: 'update',
					update: {
						table,
						event,
						row,
					},
				} satisfies ZServerSentMessage)
			)
		}
	}

	async deleteFileStuff(id: string) {
		const fileRecord = await this.replicator.getFileRecord(id)
		const room = this.env.TLDR_DOC.get(this.env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${id}`))
		await room.appFileRecordDidDelete()
		if (!fileRecord) {
			throw new Error('file record not found')
		}
		const publishedSlug = fileRecord.publishedSlug

		// Create a new slug for the published room
		await this.env.SNAPSHOT_SLUG_TO_PARENT_SLUG.delete(publishedSlug)

		// remove published files
		const publishedPrefixKey = getR2KeyForRoom({
			slug: `${id}/${publishedSlug}`,
			isApp: true,
		})
		const publishedHistory = await listAllObjectKeys(this.env.ROOM_SNAPSHOTS, publishedPrefixKey)
		await this.env.ROOM_SNAPSHOTS.delete(publishedHistory)
		// remove edit history
		const r2Key = getR2KeyForRoom({ slug: id, isApp: true })
		const editHistory = await listAllObjectKeys(this.env.ROOMS_HISTORY_EPHEMERAL, r2Key)
		await this.env.ROOMS_HISTORY_EPHEMERAL.delete(editHistory)
		// remove main file
		await this.env.ROOMS.delete(r2Key)
	}

	async publishSnapshot(file: TlaFile) {
		if (file.ownerId !== this.userId) {
			throw new ZMutationError(ZErrorCode.forbidden, 'Cannot publish file that is not our own')
		}

		try {
			const serializedSnapshot = await getCurrentSerializedRoomSnapshot(file.id, this.env)

			// Create a new slug for the published room
			await this.env.SNAPSHOT_SLUG_TO_PARENT_SLUG.put(file.publishedSlug, file.id)

			// Bang the snapshot into the database
			await this.env.ROOM_SNAPSHOTS.put(
				getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}`, isApp: true }),
				serializedSnapshot
			)
			const currentTime = new Date().toISOString()
			await this.env.ROOM_SNAPSHOTS.put(
				getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}|${currentTime}`, isApp: true }),
				serializedSnapshot
			)
		} catch (e) {
			throw new ZMutationError(ZErrorCode.publish_failed, 'Failed to publish snapshot', e)
		}
	}

	async unpublishSnapshot(file: TlaFile) {
		if (file.ownerId !== this.userId) {
			throw new ZMutationError(ZErrorCode.forbidden, 'Cannot unpublish file that is not our own')
		}

		try {
			await this.env.SNAPSHOT_SLUG_TO_PARENT_SLUG.delete(file.publishedSlug)
			await this.env.ROOM_SNAPSHOTS.delete(
				getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}`, isApp: true })
			)
		} catch (e) {
			throw new ZMutationError(ZErrorCode.unpublish_failed, 'Failed to unpublish snapshot', e)
		}
	}
}

async function listAllObjectKeys(bucket: R2Bucket, prefix: string): Promise<string[]> {
	const keys: string[] = []
	let cursor: string | undefined

	do {
		const result = await bucket.list({ prefix, cursor })
		keys.push(...result.objects.map((o) => o.key))
		cursor = result.truncated ? result.cursor : undefined
	} while (cursor)

	return keys
}

class ZMutationError extends Error {
	constructor(
		public errorCode: ZErrorCode,
		message: string,
		public cause?: unknown
	) {
		super(message)
	}
}
