import React from 'react'
import { createRoot } from 'react-dom/client'
import EnhancedToolChainEditorExample from './enhanced-example'

const container = document.getElementById('root')
const root = createRoot(container!)

root.render(
	<React.StrictMode>
		<EnhancedToolChainEditorExample />
	</React.StrictMode>
)
