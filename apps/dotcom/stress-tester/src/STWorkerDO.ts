import { DurableObject } from "cloudflare:workers";

export class STWorkerDO extends DurableObject {
	override async fetch(request: Request) {
		return new Response('Hello, world!', { status: 200 })
	}
}
