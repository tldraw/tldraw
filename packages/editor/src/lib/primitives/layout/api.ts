import { uniqueId } from '@tldraw/utils'
import { Request, RequestNode, Response, ResponseNode } from './types'

export class LayoutAPI {
	removeOverlaps(nodes: RequestNode[]) {
		return new Promise<ResponseNode[]>((resolve, reject) => {
			const rid = uniqueId()
			const abortController = new AbortController()
			const worker = new Worker(new URL('./worker', import.meta.url))

			worker.addEventListener(
				'message',
				(event: MessageEvent<Response>) => {
					const { requestId, nodes } = event.data
					if (rid !== requestId) {
						return
					}
					abortController.abort()
					resolve(nodes)
					worker.terminate()
				},
				{ signal: abortController.signal }
			)
			worker.postMessage({
				requestId: rid,
				nodes,
			} satisfies Request)

			worker.addEventListener(
				'error',
				(error: any) => {
					abortController.abort()
					reject(error)
					worker.terminate()
				},
				{ signal: abortController.signal }
			)

			worker.addEventListener(
				'abort',
				() => {
					reject(new Error('Worker aborted'))
					worker.terminate()
				},
				{ signal: abortController.signal }
			)

			setTimeout(() => {
				abortController.abort()
				reject(new Error('Worker timed out after 30 seconds'))
				worker.terminate()
			}, 2000)
		})
	}
}
