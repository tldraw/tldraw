/* eslint-disable @typescript-eslint/no-non-null-assertion */
import React from 'react'
import { GetStaticPaths, GetStaticProps } from 'next'
import { MDXRemoteSerializeResult } from 'next-mdx-remote'
import { getGuide, getGuideLinks, getMdxSource, getGuidePaths } from '../../utils/content'
import { Guide, GuideListItem } from '../../types'
import { GuideLayout } from '../../components/content/GuideLayout'
import { Mdx } from '../../components/content/Mdx'

interface Props extends Guide {
  next: GuideListItem | null
  prev: GuideListItem | null
  mdxSource: MDXRemoteSerializeResult
}

export default function MdxGuidePage({ mdxSource, ...rest }: Props) {
  return (
    <GuideLayout {...rest}>
      <Mdx mdxSource={mdxSource} />
    </GuideLayout>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  return { paths: getGuidePaths(), fallback: false }
}

export const getStaticProps: GetStaticProps<Props> = async (ctx) => {
  const slug = ctx.params?.['slug']
  const guide = getGuide(slug!.toString())
  const links = getGuideLinks(guide)
  const mdxSource = await getMdxSource(guide.content)
  return { props: { ...guide, ...links, mdxSource } }
}
