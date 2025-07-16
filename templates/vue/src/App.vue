<script setup lang="ts">
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { onMounted, useTemplateRef } from 'vue'
import { TldrawWrapper } from './TldrawWrapper'

const tldrawWrapperEl = useTemplateRef('tldraw')

onMounted(() => {
	if (!tldrawWrapperEl.value) return
	createRoot(tldrawWrapperEl.value).render(createElement(TldrawWrapper))
})
</script>

<template>
	<header>
		Here's a vue app that includes tldraw!
	</header>

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