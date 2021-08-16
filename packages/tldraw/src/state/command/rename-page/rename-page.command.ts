import type { TLDrawShape, Data, Command } from '~types'
import { TLDR } from '~state/tldr'

export function editPage(data: Data, id: string): Command {
  return {
    id: 'edit_page',
    before: {},
    after: {},
  }
}
