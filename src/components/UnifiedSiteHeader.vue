<!--
  全站统一顶栏：左侧品牌（移动端可隐藏）+ 横向 Tab；
  右侧：返回、主题、用户下拉（密码 / 退出）。
-->
<template>
  <header class="uni-nav nav-bar nav-bar--floating nav-bar--glass" aria-label="站点顶部">
    <div class="uni-nav__row">
      <a
        v-if="mode === 'app'"
        class="uni-nav__brand brand text-link-soft"
        :class="{ 'uni-nav__brand--hidden-sm': collapseBrandOnNarrow }"
        href="#home"
        @click.prevent="$emit('brand-click')"
      >
        <span class="brand__mark" aria-hidden="true">
          <svg class="brand__glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path
              d="M7 17V7h5c2.07 0 3.76 1.68 3.76 3.76S14.07 14.53 12 14.53H9.3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span class="brand__text text-shimmer">枕月听风</span>
      </a>
      <a
        v-else
        class="uni-nav__brand brand text-link-soft"
        :class="{ 'uni-nav__brand--hidden-sm': collapseBrandOnNarrow }"
        href="#layout-top"
        @click.prevent="$emit('brand-click')"
      >
        <span class="brand__mark" aria-hidden="true">
          <svg class="brand__glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path
              d="M7 17V7h5c2.07 0 3.76 1.68 3.76 3.76S14.07 14.53 12 14.53H9.3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span class="brand__text text-shimmer">枕月听风</span>
      </a>

      <nav v-if="mode === 'app' && showTabs && tabs.length" class="uni-nav__tabs-scroll" aria-label="主导航">
        <div class="uni-nav__tabs">
          <button
            v-for="t in tabs"
            :key="t.id"
            type="button"
            class="uni-nav__tab nav-link nav-link--tab"
            :class="{ 'uni-nav__tab--active': t.id === activeTabId }"
            @click="$emit('select-tab', t.id)"
          >
            <span class="uni-nav__tab-label">{{ t.label }}</span>
          </button>
        </div>
      </nav>
      <div v-else-if="mode === 'app'" class="uni-nav__tabs-spacer" />

      <div class="uni-nav__tools">
        <button
          v-if="mode === 'app' && showBack"
          type="button"
          class="uni-nav__icon-btn"
          aria-label="返回首页"
          title="返回"
          @click="$emit('back')"
        >
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button
          class="theme-toggle theme-toggle--head uni-nav__theme"
          type="button"
          :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
          :aria-pressed="isDark"
          @click="$emit('toggle-theme')"
        >
          <svg v-if="isDark" class="icon-svg" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65">
            <circle cx="12" cy="12" r="4.25" />
            <path
              d="M12 2.25v1.85M12 19.9v1.85M21.75 12h-1.85M4.1 12H2.25M18.364 5.636l-1.3 1.3M6.936 17.065l-1.3 1.3M18.364 18.364l-1.3-1.3M6.936 6.935l-1.3-1.3"
              stroke-linecap="round"
            />
          </svg>
          <svg v-else class="icon-svg" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65">
            <path d="M20 14.74A8.47 8.47 0 019.47 4a8.5 8.5 0 0010.53 10.74z" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <div v-if="mode === 'app' && userMenuOpenable" ref="userMenuRoot" class="uni-nav__user-wrap">
          <button
            type="button"
            class="uni-nav__icon-btn uni-nav__avatar-btn"
            :class="{ 'uni-nav__avatar-btn--open': userOpen }"
            aria-label="账户菜单"
            :aria-expanded="userOpen"
            aria-haspopup="true"
            @click.stop="toggleUser"
          >
            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <circle cx="12" cy="9" r="3.35" stroke-linecap="round" />
              <path
                d="M6.25 18.1c.38-2.62 3.07-4.85 5.75-4.85s5.37 2.23 5.75 4.85"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <Teleport to="body">
            <div
              v-if="userOpen"
              class="uni-nav__dropdown-portal"
              :style="dropdownStyle"
              role="menu"
              aria-label="账户"
              @click.stop
            >
              <button
                v-if="showChangePassword"
                type="button"
                class="uni-nav__dd-item"
                role="menuitem"
                @click="onPwd"
              >
                修改密码
              </button>
              <button type="button" class="uni-nav__dd-item" role="menuitem" @click="onLogout">退出登录</button>
            </div>
          </Teleport>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

export type UniNavTab = { id: string; label: string }

defineProps<{
  mode: 'login' | 'app'
  tabs: UniNavTab[]
  activeTabId: string | null
  collapseBrandOnNarrow?: boolean
  showTabs?: boolean
  showBack?: boolean
  userMenuOpenable?: boolean
  showChangePassword?: boolean
  isDark: boolean
}>()

const emit = defineEmits<{
  'brand-click': []
  'select-tab': [id: string]
  back: []
  'toggle-theme': []
  'change-password': []
  logout: []
}>()

const userOpen = ref(false)
const userMenuRoot = ref<HTMLElement | null>(null)
const dropdownStyle = ref<Record<string, string>>({})

function positionDropdown(): void {
  const el = userMenuRoot.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 6}px`,
    right: `${Math.max(8, window.innerWidth - rect.right)}px`,
    zIndex: '10050',
    minWidth: '10.5rem',
  }
}

function toggleUser(): void {
  userOpen.value = !userOpen.value
  if (userOpen.value) void nextTick(() => positionDropdown())
}

function onDocPointerDown(e: MouseEvent | TouchEvent): void {
  if (!userOpen.value) return
  const root = userMenuRoot.value
  const t = e.target as Node | null
  if (!root || !t) return
  if (!root.contains(t)) {
    const portal = document.querySelector('.uni-nav__dropdown-portal')
    if (portal && portal.contains(t)) return
    userOpen.value = false
  }
}

function onPwd(): void {
  emit('change-password')
  userOpen.value = false
}

function onLogout(): void {
  emit('logout')
  userOpen.value = false
}

watch(userOpen, (o) => {
  if (o) {
    void nextTick(() => positionDropdown())
    window.addEventListener('resize', positionDropdown, { passive: true })
    window.addEventListener('scroll', positionDropdown, { passive: true, capture: true })
  } else {
    window.removeEventListener('resize', positionDropdown)
    window.removeEventListener('scroll', positionDropdown, { capture: true })
  }
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  window.removeEventListener('resize', positionDropdown)
  window.removeEventListener('scroll', positionDropdown, { capture: true })
})
</script>

<style scoped>
.uni-nav__row {
  display: flex;
  align-items: center;
  gap: 0.5rem 0.65rem;
  width: 100%;
  min-width: 0;
}

.uni-nav__brand {
  flex-shrink: 0;
  min-width: 0;
}

@media (max-width: 720px) {
  .uni-nav__brand--hidden-sm {
    display: none;
  }
}

.uni-nav__tabs-scroll {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  mask-image: linear-gradient(to right, transparent 0, #000 8px, #000 calc(100% - 8px), transparent 100%);
}

.uni-nav__tabs {
  display: inline-flex;
  align-items: stretch;
  gap: 0.2rem;
  padding: 0.1rem 0;
}

.uni-nav__tabs-spacer {
  flex: 1;
}

.uni-nav__tab {
  white-space: nowrap;
  appearance: none;
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 550;
  padding: 0.38rem 0.72rem;
  border-radius: 999px;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.uni-nav__tab--active {
  border-color: color-mix(in srgb, var(--color-accent) 42%, transparent);
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  color: var(--color-text-strong);
}

@media (hover: hover) {
  .uni-nav__tab:hover:not(.uni-nav__tab--active) {
    background: color-mix(in srgb, var(--color-accent) 7%, transparent);
  }
}

.uni-nav__tools {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  flex-shrink: 0;
  margin-left: auto;
}

.uni-nav__icon-btn {
  width: 2.35rem;
  height: 2.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease;
}

.uni-nav__icon-btn:hover {
  background: color-mix(in srgb, var(--color-accent) 9%, transparent);
  color: var(--color-text-strong);
}

.uni-nav__avatar-btn--open {
  border-color: color-mix(in srgb, var(--color-accent) 35%, transparent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  color: var(--color-text-strong);
}

.uni-nav__dropdown-portal {
  padding: 0.35rem 0;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface-solid) 98%, transparent);
  box-shadow: var(--shadow-soft-hover);
  backdrop-filter: blur(18px);
}

.uni-nav__dd-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.55rem 1rem;
  border: none;
  background: none;
  font: inherit;
  font-size: 0.92rem;
  color: var(--color-text-strong);
  cursor: pointer;
}

.uni-nav__dd-item:hover {
  background: color-mix(in srgb, var(--color-accent) 9%, transparent);
}

.uni-nav__theme {
  margin: 0;
}
</style>
