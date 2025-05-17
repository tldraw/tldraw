import { uniqueId } from 'tldraw'
import type { VscodeMessage, VscodeMessagePairs } from '../../../messages'
import { vscode } from './vscode'

interface SimpleRpcOpts {
	timeout: number
}
class SimpleRpcError extends Error {
	id: string
	data: any
	constructor(id: keyof VscodeMessagePairs, data: any) {
		super(`Failed ${id}`)
		this.id = id
		this.data = data
	}
}

export function rpc<T extends keyof VscodeMessagePairs>(
	id: T,
	data: VscodeMessagePairs[T]['request']['data'],
	opts: SimpleRpcOpts = { timeout: 5 * 1000 }
) {
	const { timeout } = opts
	type RequestType = VscodeMessagePairs[T]['request']
	type ResponseType = VscodeMessagePairs[T]['response']
	type ErrorType = VscodeMessagePairs[T]['error']

	const type = (id + '/request') as RequestType['type']
	const uuid = uniqueId()
	return new Promise<ResponseType['data']>((resolve, reject) => {
		const inMessage: VscodeMessage = {
			uuid,
			type,
			data,
		}
		vscode.postMessage(inMessage)

		const handler = ({ data: response }: MessageEvent<ResponseType | ErrorType>) => {
			// Only handle messages that are meant to be a direct response to the message we sent
			if (response.uuid !== uuid + '_response') {
				return
			}

			const cleanup = () => {
				window.removeEventListener('message', handler)
			}

			if (response.type === `${id}/response`) {
				cleanup()
				resolve(response.data as ResponseType['data'])
			}
			if (response.type === `${id}/error`) {
				cleanup()
				reject(new SimpleRpcError(id, response.data as ErrorType['data']))
			}
			setTimeout(() => {
				cleanup()
				reject(new SimpleRpcError(id, { timeout: true }))
			}, timeout)
		}
		window.addEventListener('message', handler)
	})
}
