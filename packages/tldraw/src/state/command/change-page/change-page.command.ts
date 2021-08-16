import type { TLDrawShape, Data, Command } from '~types'
import { TLDR } from '~state/tldr'

export function changePage(data: Data): Command {
  return {
    id: 'create_page',
    before: {},
    after: {},
  }
}
