export const isInIframe = () => {
	return typeof window !== 'undefined' && (window !== window.top || window.self !== window.parent)
}
