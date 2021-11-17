import { MDXProvider } from '@mdx-js/react'
import Image from 'next/image'

const ResponsiveImage = (props: any) => <Image alt={props.alt} layout="responsive" {...props} />

const components = {
  img: ResponsiveImage,
}

export default function Post(props) {
  return (
    <MDXProvider components={components}>
      <main {...props} />
    </MDXProvider>
  )
}
