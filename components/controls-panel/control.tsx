import state, { useSelector } from 'state'
import styled from 'styles'
import { ControlType, NumberCodeControl, VectorCodeControl } from 'types'

export default function Control({ id }: { id: string }): JSX.Element {
  const control = useSelector((s) => s.data.codeControls[id])

  if (!control) return null

  return (
    <>
      <label>{control.label}</label>
      {control.type === ControlType.Number ? (
        <NumberControl {...control} />
      ) : control.type === ControlType.Vector ? (
        <VectorControl {...control} />
      ) : null}
    </>
  )
}

function NumberControl({ id, min, max, step, value }: NumberCodeControl) {
  return (
    <Inputs>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) =>
          state.send('CHANGED_CODE_CONTROL', {
            [id]: Number(e.currentTarget.value),
          })
        }
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) =>
          state.send('CHANGED_CODE_CONTROL', {
            [id]: Number(e.currentTarget.value),
          })
        }
      />
    </Inputs>
  )
}

function VectorControl({ id, value, isNormalized }: VectorCodeControl) {
  return (
    <Inputs>
      <input
        type="range"
        min={isNormalized ? -1 : -Infinity}
        max={isNormalized ? 1 : Infinity}
        step={0.01}
        value={value[0]}
        onChange={(e) =>
          state.send('CHANGED_CODE_CONTROL', {
            [id]: [Number(e.currentTarget.value), value[1]],
          })
        }
      />
      <input
        type="number"
        min={isNormalized ? -1 : -Infinity}
        max={isNormalized ? 1 : Infinity}
        step={0.01}
        value={value[0]}
        onChange={(e) =>
          state.send('CHANGED_CODE_CONTROL', {
            [id]: [Number(e.currentTarget.value), value[1]],
          })
        }
      />
      <input
        type="range"
        min={isNormalized ? -1 : -Infinity}
        max={isNormalized ? 1 : Infinity}
        step={0.01}
        value={value[1]}
        onChange={(e) =>
          state.send('CHANGED_CODE_CONTROL', {
            [id]: [value[0], Number(e.currentTarget.value)],
          })
        }
      />
      <input
        type="number"
        min={isNormalized ? -1 : -Infinity}
        max={isNormalized ? 1 : Infinity}
        step={0.01}
        value={value[1]}
        onChange={(e) =>
          state.send('CHANGED_CODE_CONTROL', {
            [id]: [value[0], Number(e.currentTarget.value)],
          })
        }
      />
    </Inputs>
  )
}

const Inputs = styled('div', {
  display: 'flex',
  gap: '8px',
  height: '100%',

  '& input': {
    font: '$ui',
    width: '64px',
    fontSize: '$1',
    border: '1px solid $inputBorder',
    backgroundColor: '$input',
    color: '$text',
    height: '100%',
    padding: '0px 6px',
  },
  "& input[type='range']": {
    padding: 0,
    flexGrow: 2,
  },
})
