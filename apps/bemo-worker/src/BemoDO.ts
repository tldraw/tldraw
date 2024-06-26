import { DurableObject } from 'cloudflare:workers'
import { Environment } from './types'

export class BemoDO extends DurableObject<Environment> {
	async hello() {
		console.log('log from a DO')
		return `hello from a durable object! here's my env: ${JSON.stringify(this.env, null, 2)}`
	}

	async throw() {
		console.log('log from a DO')
		this.doAnError()
	}

	doAnError() {
		throw new Error('this is an error from a DO')
	}
}
