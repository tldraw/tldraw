/// <reference types="@cloudflare/workers-types" />
import { IRequest } from 'itty-router'
import { Environment } from './types'
export declare function handleAssetUpload(
	request: IRequest,
	env: Environment
): Promise<
	| Response
	| {
			ok: boolean
	  }
>
export declare function handleAssetDownload(
	request: IRequest,
	env: Environment,
	ctx: ExecutionContext
): Promise<Response>
