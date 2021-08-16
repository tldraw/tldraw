import type { TLDrawShape, Data, Command } from '~types'
import { TLDR } from '~state/tldr'

export function duplicatePage(data: Data, id: string): Command {
  return {
    id: 'duplicate_page',
    before: {},
    after: {},
  }
}
