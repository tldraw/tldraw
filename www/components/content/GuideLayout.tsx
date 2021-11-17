import React from 'react'
import { Guide, GuideListItem } from '../../types'
import { Layout } from './Layout'
import { styled } from '../../styles'

interface GuideLayoutProps extends Omit<Guide, 'content'> {
  next: GuideListItem | null
  prev: GuideListItem | null
  children: React.ReactNode
}

export function GuideLayout({ data, children }: GuideLayoutProps) {
  return (
    <Layout>
      <article>
        <PostHeader>
          <h1>{data.title}</h1>
        </PostHeader>
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
