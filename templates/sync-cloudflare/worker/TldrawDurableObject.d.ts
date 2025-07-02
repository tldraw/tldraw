/// <reference types="@cloudflare/workers-types" />
import { TLSocketRoom } from '@tldraw/sync-core'
import { TLRecord } from '@tldraw/tlschema'
import { IRequest } from 'itty-router'
import { Environment } from './types'
export declare class TldrawDurableObject {
	private readonly ctx
	private r2
	private roomId
	private roomPromise
	constructor(ctx: DurableObjectState, env: Environment)
	private readonly router
	fetch(request: Request): Response | Promise<Response>
	handleConnect(request: IRequest): Promise<Response>
	getRoom(): Promise<TLSocketRoom<TLRecord, void>>
	schedulePersistToR2: import('lodash').DebouncedFuncLeading<() => Promise<void>>
}
