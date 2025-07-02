/// <reference types="@cloudflare/workers-types" />
import { IRequest } from 'itty-router'
import { Environment } from './types'
export { TldrawDurableObject } from './TldrawDurableObject'
declare const router: import('itty-router').IttyRouterType<
	IRequest,
	[env: Environment, ctx: ExecutionContext]
>
export default router
