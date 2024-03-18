import JSDOMEnvironment from 'jest-environment-jsdom'

export default class FixJSDOMEnvironment extends JSDOMEnvironment {
	constructor(...args) {
		super(...args)

		// fixes https://github.com/jsdom/jsdom/issues/3363
		this.global.structuredClone = structuredClone
	}
}
