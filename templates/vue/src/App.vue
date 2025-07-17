<script setup lang="ts">
import { createElement } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { onMounted, onUnmounted, useTemplateRef } from 'vue'
import { TldrawWrapper } from './TldrawWrapper'

const tldrawWrapperEl = useTemplateRef('tldraw')
let root: Root | null = null

onMounted(() => {
	if (!tldrawWrapperEl.value) return
	root = createRoot(tldrawWrapperEl.value)
	root.render(createElement(TldrawWrapper))
})

onUnmounted(() => {
	if (root) {
		root.unmount()
		root = null
	}
})
</script>

<template>
	<header>Here's a vue app that includes tldraw!</header>

	<main ref="tldraw" />
</template>

<style scoped>
header {
	padding: 1rem;
	border-bottom: 1px solid #e0e0e0;
}

main {
	flex: 1;
}
</style>
