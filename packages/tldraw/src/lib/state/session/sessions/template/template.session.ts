import { BaseSession } from '../session-types'
import { Data } from '../../../../types'
import { Command } from '../../../commands'

export class TemplateSession implements BaseSession {
  origin: number[]

  constructor(_ata: Data, point: number[]) {
    this.origin = point
  }

  update = (_data: Data, _point: number[]): void => {
    void null
  }

  cancel = (_data: Data): void => {
    void null
  }

  complete = (_data: Data) => {
    return new Command({
      name: 'Command',
      category: 'example',
      do: () => null,
      undo: () => null,
    })
  }
}
