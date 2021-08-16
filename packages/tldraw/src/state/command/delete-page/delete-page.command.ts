import type { TLDrawShape, Data, Command } from '~types'
import { TLDR } from '~state/tldr'

export function deletePage(data: Data, id: string): Command {
  return {
    id: 'delete_page',
    before: {},
    after: {},
  }
}
