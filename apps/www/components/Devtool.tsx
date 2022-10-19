import { InspectParams, Inspector } from 'react-dev-inspector'

const Devtools = () => {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  return (
    <Inspector
      // props see docs:
      // https://github.com/zthxxx/react-dev-inspector#inspector-component-props
      keys={['control', 'c']}
      disableLaunchEditor
      onClickElement={({ codeInfo }: InspectParams) => {
        if (!codeInfo?.absolutePath) return
        const { absolutePath, lineNumber, columnNumber } = codeInfo
        // you can change the url protocol if you are using in Web IDE
        window.open(`vscode://file/${absolutePath}:${lineNumber}:${columnNumber}`)
      }}
    >
      <div className={`absolute bottom-2 right-2 bg-yellow-400`}>ctrl + c</div>
    </Inspector>
  )
}

export default Devtools
