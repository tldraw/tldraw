import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Head from 'next/head'
import { Post, PostListItem } from '../../types'
import { Layout } from './Layout'
import { styled } from '../../styles'

interface LayoutProps extends Omit<Post, 'content'> {
  next: PostListItem | null
  prev: PostListItem | null
  children: React.ReactNode
}

export function PostLayout({ data, date, slug, next, prev, children }: LayoutProps) {
  return (
    <Layout>
      <Head>
        <title>{data.title} - tldraw blog</title>
        <meta charSet="utf-8" />
        <meta property="og:title" content="tldraw blog" key="title" />
        <meta property="og:type" content="website" />
        <meta name="description" content={data.description} />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@tldraw" />
        <meta name="twitter:creator" content="@tldraw" />
        <meta name="twitter:title" content={data.title} />
        <meta name="twitter:site" content="@tldraw" />
        <meta name="twitter:url" content="https://tldraw.com" />
        <meta name="twitter:image" content={'http://tldraw.com/images/blog/' + data.hero} />
        <meta name="twitter:creator" content="@tldraw" />
        <meta name="twitter:description" content={data.description} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={data.title} />
        <meta property="og:site_name" content={data.title} />
        <meta property="og:url" content="https://tldraw.com" />
        <meta property="og:image" content={'http://tldraw.com/images/blog/' + data.hero} />
      </Head>
      <article>
        <PostHeader>
          <Link href={'/posts/' + slug} passHref>
            <h1>{data.title}</h1>
          </Link>
          <time dateTime={data.date}>{data.date}</time>
        </PostHeader>
        {data.hero && (
          <Image
            src={data.hero}
            alt={data.title}
            title={data.title}
            width={720}
            height={400}
            layout="intrinsic"
            objectFit="cover"
          />
        )}
        <main>{children}</main>
      </article>
    </Layout>
  )
}

const PostHeader = styled('header', {
  mb: '$4',
  date: {
    mb: '$4',
    fontSize: '$0',
  },
})
