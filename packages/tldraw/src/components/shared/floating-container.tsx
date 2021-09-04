import styled from '~styles'

/* -------------------------------------------------- */
/*                 Floating Container                 */
/* -------------------------------------------------- */

export const FloatingContainer = styled('div', {
  backgroundColor: '$panel',
  border: '1px solid $panel',
  borderRadius: '4px',
  boxShadow: '$4',
  display: 'flex',
  height: 'fit-content',
  padding: '$0',
  pointerEvents: 'all',
  position: 'relative',
  userSelect: 'none',
  zIndex: 200,

  variants: {
    direction: {
      row: {
        flexDirection: 'row',
      },
      column: {
        flexDirection: 'column',
      },
    },
    elevation: {
      0: {
        boxShadow: 'none',
      },
      2: {
        boxShadow: '$2',
      },
      3: {
        boxShadow: '$3',
      },
      4: {
        boxShadow: '$4',
      },
    },
  },
})
