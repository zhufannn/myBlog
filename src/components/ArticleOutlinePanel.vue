<template>
  <aside class="outline-panel" aria-label="文档大纲">
    <h3 class="outline-panel__title">大纲</h3>
    <p v-if="!items.length" class="outline-panel__empty">正文中使用标题后会显示在此。</p>
    <nav v-else class="outline-panel__nav">
      <a
        v-for="(it, idx) in items"
        :key="`${it.anchor}-${idx}`"
        class="outline-panel__link outline-panel__link--ellipsis"
        :title="it.text"
        :style="{ paddingLeft: `${0.65 + (it.level - 1) * 0.65}rem` }"
        href="#"
        role="button"
        @click.prevent="emitJump(idx)"
      >
        {{ it.text }}
      </a>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { HeadingOutlineItem } from '../utils/extractHeadingOutline'

const props = defineProps<{
  outline: HeadingOutlineItem[]
}>()

const emit = defineEmits<{
  /** 交给父组件在语雀编辑器 DOM 内滚动定位 */
  'jump-anchor': [payload: { anchor: string; index: number }]
}>()

const items = computed(() => props.outline)

function emitJump(idx: number): void {
  const it = items.value[idx]
  if (!it) return
  emit('jump-anchor', { anchor: it.anchor, index: idx })
}
</script>

<style scoped>
.outline-panel {
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 6rem);
  overflow: auto;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--border-subtle, rgba(120, 120, 140, 0.22));
  background: var(--surface-elevated, rgba(255, 255, 255, 0.04));
}

.outline-panel__title {
  margin: 0 0 0.5rem;
  font-size: 0.82rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}

.outline-panel__empty {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.outline-panel__nav {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.outline-panel__link {
  display: block;
  font-size: 0.82rem;
  line-height: 1.35;
  color: var(--color-text-strong);
  text-decoration: none;
  border-radius: 6px;
  padding: 0.25rem 0.35rem;
  cursor: pointer;
}

.outline-panel__link--ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline-panel__link:hover {
  background: rgba(120, 120, 140, 0.12);
}
</style>
