import { scope, components } from './mdx-components'
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote'

interface MdxProps {
  mdxSource: MDXRemoteSerializeResult
}

export function Mdx({ mdxSource }: MdxProps) {
  return <MDXRemote {...mdxSource} scope={scope} components={components} />
}
