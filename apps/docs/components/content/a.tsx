import Link from 'next/link'

export function A(props: React.ComponentProps<'a'>) {
	const isLocalUrl = props.href?.startsWith('/') || props.href?.startsWith('#')
	let maybeParsedUrl
	try {
		maybeParsedUrl = isLocalUrl ? null : props.href ? new URL(props.href) : null
	} catch {
		console.error(`Invalid URL: ${props.href}`)
	}
	const derivedTarget =
		isLocalUrl ||
		maybeParsedUrl?.host.includes('tldraw.com') ||
		maybeParsedUrl?.host.includes('localhost')
			? undefined
			: '_blank'
	const target = props.target ?? derivedTarget

	if (isLocalUrl) {
		return <Link {...(props as React.ComponentProps<typeof Link>)} target={target} />
	} else {
		return <a {...props} target={target} />
	}
}
