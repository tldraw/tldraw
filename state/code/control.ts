import {
  CodeControl,
  ControlType,
  NumberCodeControl,
  VectorCodeControl,
} from 'types'
import { uniqueId } from 'utils'

export const controls: Record<string, any> = {}

export const codeControls = new Set<CodeControl>([])

/* ----------------- Start Copy Here ---------------- */

export class Control<T extends CodeControl> {
  _control: T

  constructor(control: T) {
    this._control = { ...control }
    codeControls.add(this._control)

    // Could there be a better way to prevent this?
    // When updating, constructor should just bind to
    // the existing control rather than creating a new one?
    if (!(window as any).isUpdatingCode) {
      controls[this._control.label] = this._control.value
    }
  }

  destroy(): void {
    codeControls.delete(this.control)
    delete controls[this.control.label]
  }

  get control(): T {
    return this._control
  }

  get id(): string {
    return this.control.id
  }

  get value(): T['value'] {
    return this.control.value
  }
}

type ControlProps<T extends CodeControl> = Omit<Partial<T>, 'type'>

export class NumberControl extends Control<NumberCodeControl> {
  constructor(options: ControlProps<NumberCodeControl>) {
    const { id = uniqueId(), label = 'Number', value = 0, step = 1 } = options

    super({
      type: ControlType.Number,
      ...options,
      label,
      value,
      step,
      id,
    })
  }
}

export class VectorControl extends Control<VectorCodeControl> {
  constructor(options: ControlProps<VectorCodeControl>) {
    const {
      id = uniqueId(),
      label = 'Vector',
      value = [0, 0],
      isNormalized = false,
    } = options

    super({
      type: ControlType.Vector,
      ...options,
      label,
      value,
      isNormalized,
      id,
    })
  }
}
