declare module '*.png' {
	const url: string
	export default url
}

declare module '*.svg' {
	const content: any
	export default content
}
