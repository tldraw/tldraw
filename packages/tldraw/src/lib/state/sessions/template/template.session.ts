import { BaseSession } from '../session-types'
import { Data } from '../../../types'

export class TemplateSession implements BaseSession {
  origin: number[]

  constructor(_ata: Data, point: number[]) {
    // TODO
    this.origin = point
  }

  update = (_data: Data, _point: number[]): void => {
    // TODO
  }

  cancel = (_data: Data): void => {
    // TODO
  }

  complete = (_data: Data): void => {
    // TODO
  }
}
