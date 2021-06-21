import styled from 'styles'

export default function CodeDocs({
  isHidden,
}: {
  isHidden: boolean
}): JSX.Element {
  return (
    <StyledDocs isHidden={isHidden}>
      <h2>Docs</h2>
    </StyledDocs>
  )
}

const StyledDocs = styled('div', {
  position: 'absolute',
  backgroundColor: '$panel',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  padding: 16,
  font: '$docs',
  overflowY: 'scroll',
  userSelect: 'none',
  paddingBottom: 64,

  variants: {
    isHidden: {
      true: {
        visibility: 'hidden',
      },
      false: {
        visibility: 'visible',
      },
    },
  },

  '& ol': {},

  '& li': {
    marginTop: 8,
    marginBottom: 4,
  },

  '& code': {
    font: '$mono',
  },

  '& hr': {
    margin: '32px 0',
    borderColor: '$muted',
  },

  '& h2': {
    margin: '24px 0px',
  },

  '& h3': {
    fontSize: 20,
    margin: '48px 0px 32px 0px',
  },

  '& h3 > code': {
    fontWeight: 600,
    font: '$monoheading',
  },

  '& h4': {
    margin: '32px 0px 0px 0px',
  },

  '& h4 > code': {
    font: '$monoheading',
    fontSize: 16,
    userSelect: 'all',
  },

  '& h4 > code > i': {
    fontSize: 14,
    color: '$muted',
  },

  '& pre': {
    backgroundColor: '$bounds_bg',
    padding: 16,
    borderRadius: 4,
    userSelect: 'all',
    margin: '24px 0',
  },

  '& p > code, blockquote > code': {
    backgroundColor: '$bounds_bg',
    padding: '2px 4px',
    borderRadius: 2,
    color: '$code',
  },

  '& blockquote': {
    backgroundColor: 'rgba(144, 144, 144, .05)',
    padding: 12,
    margin: '20px 0',
    borderRadius: 8,
  },
})
