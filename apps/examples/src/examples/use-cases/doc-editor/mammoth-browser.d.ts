// Minimal types for mammoth's prebuilt browser bundle. We use the browser bundle
// because mammoth's main entry pulls in Node-only modules (fs, Buffer).
declare module 'mammoth/mammoth.browser' {
	interface MammothMessage {
		type: string
		message: string
	}
	interface ConvertResult {
		value: string
		messages: MammothMessage[]
	}
	const mammoth: {
		convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<ConvertResult>
	}
	export default mammoth
}
