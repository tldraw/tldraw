import styled from 'styles'
import ReactMarkdown from 'react-markdown'
import docs from './docs-content'

export default function CodeDocs({
  isHidden,
}: {
  isHidden: boolean
}): JSX.Element {
  return (
    <StyledDocs isHidden={isHidden}>
      <ReactMarkdown>{docs.content}</ReactMarkdown>
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
  overflowY: 'scroll',
  userSelect: 'none',
  paddingBottom: 64,
  fontFamily: '$body',
  fontWeight: 500,

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

  '& p': {
    fontSize: '$3',
    lineHeight: '1.3',
  },

  '& ol, ul': {
    fontSize: '$3',
    lineHeight: '1.3',
    marginTop: 16,
    marginBottom: 16,
  },

  '& li': {
    fontSize: '$3',
    lineHeight: '1.5',
  },

  '& code': {
    font: '$mono',
  },

  '& hr': {
    margin: '32px 0',
    borderColor: '$muted',
  },

  '& h2': {
    margin: '40px 0px 24px 0',
  },

  '& h3': {
    fontSize: 20,
    margin: '48px 0px 32px 0px',
  },

  '& h3 > code': {
    fontWeight: 600,
    font: '$mono',
  },

  '& h4': {
    margin: '32px 0px 0px 0px',
  },

  '& h4 > code': {
    font: '$mono',
    fontSize: 16,
    userSelect: 'all',
  },

  '& h4 > code > i': {
    fontSize: 14,
    color: '$muted',
  },

  '& pre': {
    border: '1px solid $brushStroke',
    font: '$ui',
    fontWeight: 420,
    lineHeight: 1.5,
    padding: 16,
    borderRadius: 4,
    userSelect: 'all',
    margin: '24px 0',
  },

  '& p > code, blockquote > code': {
    padding: '2px 4px',
    borderRadius: 2,
    color: '$text',
    backgroundColor: '$codeHl',
  },

  '& blockquote': {
    backgroundColor: 'rgba(144, 144, 144, .05)',
    padding: 12,
    margin: '20px 0',
    borderRadius: 8,
  },
})
