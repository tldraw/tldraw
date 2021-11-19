import { NextApiRequest, NextApiResponse } from 'next'

const AV_SIZE = 32
const PADDING = 4
const COLS = 16

type SponsorResult = { url: string; login: string }
type QueryResult = {
  node: { sponsorEntity: { avatarUrl: string; login: string } }
}

function getXY(i: number) {
  return [(i % COLS) * (AV_SIZE + PADDING), Math.floor(i / COLS) * (AV_SIZE + PADDING)]
}

export default async function GetSponsors(req: NextApiRequest, res: NextApiResponse) {
  const sponsorInfo = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'bearer ' + process.env.GITHUB_API_SECRET,
    },
    body: JSON.stringify({
      query: `{
        viewer {
          sponsors(first: 0) {
            totalCount
          }
          sponsorshipsAsMaintainer(first: 100, orderBy: {
            field:CREATED_AT,
            direction:DESC
          }) {
            edges {
              node {
                sponsorEntity {
                  ...on User {
                    avatarUrl
                    login
                  }
                }
              }
            }
          }
        }
      }`,
    }),
  }).then((res) => res.json())

  const totalCount: number = sponsorInfo.data.viewer.sponsors.totalCount

  const results = (
    sponsorInfo.data.viewer.sponsorshipsAsMaintainer.edges as QueryResult[]
  ).map<SponsorResult>((edge) => ({
    url: edge.node.sponsorEntity.avatarUrl?.replaceAll('&', '&amp;') ?? '',
    login: edge.node.sponsorEntity.login,
  }))

  if (results.length % COLS <= 2) {
    results.pop()
    results.pop()
    results.pop()
  }

  // Avatars

  const avatars = results
    .map(({ url, login }, i) => {
      const [x, y] = getXY(i)
      return `<image alt="${login}" href="${url}" x="${x}" y="${y}" width="${AV_SIZE}" height="${AV_SIZE}"/>`
    })
    .join('')

  // More text

  const [x, y] = getXY(results.length)
  const width = (AV_SIZE + PADDING) * 3
  const more = `
  <g transform="translate(${x},${y})"><text text-lenth="${width}" font-family="Arial" font-size="12px" font-weight="bold" text-anchor="middle" text-align="center" x="${
    width / 2
  }" y="${AV_SIZE / 2 + 3}">...and ${totalCount - 100} more!</text></g>`

  const svgImage = `
<svg xmlns="http://www.w3.org/2000/svg"><a href="https://github.com/sponsors/steveruizok"><g>${avatars}${more}</g></a></svg>`

  // const html = `
  // <div style="display: grid; width: fit-content; grid-template-columns: repeat(25, auto); gap: 4px;">
  //     ${images.join(`
  //       `)}
  // </div>`

  res.status(200).setHeader('Content-Type', 'image/svg+xml').send(svgImage)
}
