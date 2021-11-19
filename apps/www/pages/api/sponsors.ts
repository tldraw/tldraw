import { NextApiRequest, NextApiResponse } from 'next'

const AV_SIZE = 32
const PADDING = 4
const COLS = 16

type SponsorResult = { avatarUrl: string; login: string }

type QueryResult = {
  node: { sponsorEntity: { avatarUrl: string; login: string } }
}

function getXY(i: number) {
  return [(i % COLS) * (AV_SIZE + PADDING), Math.floor(i / COLS) * (AV_SIZE + PADDING)]
}

export default async function GetSponsors(_req: NextApiRequest, res: NextApiResponse) {
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

  // Get the total count of sponsors
  const totalCount: number = sponsorInfo.data.viewer.sponsors.totalCount

  // Map out the login and avatarUrl for each sponsor
  const sponsors = (
    sponsorInfo.data.viewer.sponsorshipsAsMaintainer.edges as QueryResult[]
  ).map<SponsorResult>((edge) => ({
    login: edge.node.sponsorEntity.login,
    avatarUrl: edge.node.sponsorEntity.avatarUrl?.replace(/&/g, '&amp;') ?? '',
  }))

  // If we're going to create a more link (see below), then make room for it if necessary

  if (totalCount > 100 && sponsors.length % COLS <= 2) {
    sponsors.pop()
    sponsors.pop()
    sponsors.pop()
  }

  // Generate images for each of the first 100 sponsors.

  const avatars = sponsors
    .map(({ avatarUrl, login }, i) => {
      const [x, y] = getXY(i)
      return `<image alt="${login}" href="${avatarUrl}" x="${x}" y="${y}" width="${AV_SIZE}" height="${AV_SIZE}"/>`
    })
    .join('')

  // If there are more than 100 sponsors, generate some text to list how many more.

  let more = ''

  if (totalCount > sponsors.length) {
    // More text
    const [x, y] = getXY(sponsors.length)
    const width = (AV_SIZE + PADDING) * 3
    more = `<g transform="translate(${x},${y})"><text text-lenth="${width}" font-family="Arial" font-size="12px" font-weight="bold" text-anchor="middle" text-align="center" x="${
      width / 2
    }" y="${AV_SIZE / 2 + 3}">...and ${totalCount - sponsors.length} more!</text></g>`
  }

  const svgImage = `
<svg xmlns="http://www.w3.org/2000/svg"><a href="https://github.com/sponsors/steveruizok">${avatars}${more}</a></svg>`

  res
    .status(200)
    .setHeader('Cache-Control', 'max-age=604800')
    .setHeader('Content-Type', 'image/svg+xml')
    .send(svgImage)
}
