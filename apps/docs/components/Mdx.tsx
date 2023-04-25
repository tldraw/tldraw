import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote'
import { components, scope } from './mdx-components'

interface MdxProps {
	mdxSource: MDXRemoteSerializeResult
}

export function Mdx({ mdxSource }: MdxProps) {
	return <MDXRemote {...mdxSource} scope={scope} components={components as any} />
}
