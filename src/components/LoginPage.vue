<!--
  首页门禁登录表单：校验通过后由父级写入会话。
-->
<template>
  <section class="login-shell" aria-labelledby="login-title">
    <div class="login-shell__noise" aria-hidden="true" />

    <section class="login-page surface-card surface-card--block">
      <div class="login-page__accent" aria-hidden="true" />

      <header class="login-page__head">
        <div class="login-page__badge" aria-hidden="true">
          <svg class="login-page__badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55">
            <rect x="5" y="11" width="14" height="10" rx="2" ry="2" stroke-linejoin="round" />
            <path
              d="M8 11V8a4 4 0 018 0v3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <p class="eyebrow login-page__eyebrow">Private</p>
        <h1 id="login-title" class="text-shimmer login-page__title">登录</h1>
        <hr class="section-rule login-page__rule" aria-hidden="true" />
      </header>

      <form class="login-form" autocomplete="on" @submit.prevent="submit">
        <label class="login-field">
          <span class="meta-quiet login-field__label">账号</span>
          <span class="login-field__wrap">
            <svg class="login-field__glyph" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="9.25" r="3.65" stroke="currentColor" stroke-width="1.55" />
              <path
                d="M6 19.75v-.65a5 5 0 0110 0v.65"
                stroke="currentColor"
                stroke-width="1.55"
                stroke-linecap="round"
              />
            </svg>
            <input
              v-model.trim="username"
              class="login-field__input"
              type="text"
              name="username"
              autocomplete="username"
              required
              autocapitalize="off"
              spellcheck="false"
              placeholder="输入用户名"
            />
          </span>
        </label>
        <label class="login-field">
          <span class="login-field__label-row">
            <span class="meta-quiet login-field__label">密码</span>
            <span class="login-field__count meta-quiet" aria-live="polite">已输入 {{ password.length }} 位</span>
          </span>
          <span class="login-field__wrap login-field__wrap--password-actions">
            <svg class="login-field__glyph" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 14.25v2M8.75 11.75h6.5a1.75 1.75 0 011.75 1.75v4.5a1.75 1.75 0 01-1.75 1.75h-6.5A1.75 1.75 0 017 17.75v-4.5a1.75 1.75 0 011.75-1.75z"
                stroke="currentColor"
                stroke-width="1.55"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M9.25 11.75V8.5a2.75 2.75 0 015.5 0v3.25"
                stroke="currentColor"
                stroke-width="1.55"
                stroke-linecap="round"
              />
            </svg>
            <input
              id="login-password"
              ref="passwordInputRef"
              v-model="password"
              class="login-field__input"
              :type="showPassword ? 'text' : 'password'"
              name="password"
              required
              autocomplete="current-password"
              placeholder="输入密码"
            />
            <div class="login-field__trailing" role="group" aria-label="密码辅助操作">
              <button
                v-if="password.length > 0"
                class="login-field__icon-btn login-field__clear"
                type="button"
                aria-label="清空密码"
                @click="clearPassword"
              >
                <svg class="login-field__icon-btn-glyph" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M17 7L7 17M7 7l10 10"
                    stroke="currentColor"
                    stroke-width="1.65"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
              <button
                class="login-field__icon-btn"
                type="button"
                :aria-pressed="showPassword"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                @click="showPassword = !showPassword"
              >
                <svg v-if="!showPassword" class="login-field__icon-btn-glyph" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                    stroke="currentColor"
                    stroke-width="1.55"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.55" />
                </svg>
                <svg v-else class="login-field__icon-btn-glyph" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4.5 4.5l15 15M9.88 9.88a3 3 0 104.24 4.24M7.05 7.05A10.1 10.1 0 002.25 12s3.75 6.75 9.75 6.75c1.47 0 2.79-.37 3.94-.96M15.12 15.12A10 10 0 0021.75 12s-3.75-6.75-9.75-6.75c-.84 0-1.64.12-2.39.33"
                    stroke="currentColor"
                    stroke-width="1.55"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>
          </span>
        </label>

        <transition name="login-error-pop">
          <p v-if="errorTip" class="login-error" role="alert">
            <svg class="login-error__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9.25" stroke="currentColor" stroke-width="1.45" />
              <path d="M12 8v5M12 16.2v.1" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" />
            </svg>
            <span>{{ errorTip }}</span>
          </p>
        </transition>

        <button class="btn btn-primary login-submit" type="submit" :disabled="submitting">
          <span>{{ submitting ? '验证中…' : '登录' }}</span>
          <svg class="login-submit__chev" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h12M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <p class="login-alt__label meta-quiet" role="presentation">或</p>
        <button class="btn btn-ghost login-guest" type="button" @click="enterAsGuest">
          游客进入（无需账号）
        </button>
      </form>
    </section>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { loginMemberRemote, type MemberId } from '../composables/useBlogAuth'

const emit = defineEmits<{
  success: [role: 'member' | 'guest', memberId?: MemberId, displayName?: string]
}>()

const username = ref('')
const password = ref('')
const errorTip = ref('')
const submitting = ref(false)
const showPassword = ref(false)
const passwordInputRef = ref<HTMLInputElement | null>(null)

function clearPassword(): void {
  password.value = ''
  errorTip.value = ''
  void nextTick(() => passwordInputRef.value?.focus())
}

async function submit(): Promise<void> {
  errorTip.value = ''
  submitting.value = true
  try {
    const r = await loginMemberRemote(username.value, password.value)
    if (!r.ok) {
      errorTip.value = r.error
      password.value = ''
      return
    }
    emit('success', 'member', r.memberId, r.displayName)
  } finally {
    submitting.value = false
  }
}

function enterAsGuest(): void {
  errorTip.value = ''
  emit('success', 'guest')
}
</script>

<style scoped>
.login-shell {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
  padding-top: clamp(2rem, 8vw, 4rem);
  padding-bottom: clamp(2rem, 8vw, 4rem);
  padding-left: max(clamp(1rem, 4vw, 2rem), env(safe-area-inset-left, 0px));
  padding-right: max(clamp(1rem, 4vw, 2rem), env(safe-area-inset-right, 0px));
  min-height: min(72vh, 640px);
}

.login-shell__noise {
  position: absolute;
  inset: -8%;
  opacity: 0.028;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
}

.login-page {
  position: relative;
  width: min(420px, 100%);
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
  isolation: isolate;
  border-radius: calc(var(--radius-xl) + 4px);
  /**
   * 与 .surface-card 的 1px border 合一，避免再叠一层 0 0 0 1px 阴影——在圆角顶部易产生“双线/灰缝”。
   */
  border-color: color-mix(in srgb, var(--color-accent-strong) 22%, var(--color-border));
  box-shadow: var(--shadow-soft), inset 0 1px 0 color-mix(in srgb, var(--color-accent-strong) 22%, transparent);
  animation: login-enter 0.72s var(--ease-out) both;
}

.login-page__accent {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(ellipse 120% 90% at 12% -20%, color-mix(in srgb, var(--color-accent-strong) 20%, transparent), transparent 52%),
    radial-gradient(ellipse 90% 70% at 108% 108%, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 48%);
  pointer-events: none;
  z-index: 0;
}

.login-page > :not(.login-page__accent) {
  position: relative;
  z-index: 1;
}

.login-page__head {
  text-align: center;
}

.login-page__badge {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin: 0 auto 1rem;
  border-radius: 16px;
  color: var(--color-accent-strong);
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--color-accent) 22%, transparent),
    color-mix(in srgb, var(--color-accent-strong) 12%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--color-accent-strong) 38%, transparent);
  box-shadow:
    0 10px 28px color-mix(in srgb, var(--color-accent) 18%, transparent),
    inset 0 1px 0 color-mix(in srgb, white 28%, transparent);
}

:global(html.theme-dark) .login-page__badge {
  box-shadow:
    0 12px 36px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 color-mix(in srgb, white 10%, transparent);
}

.login-page__badge-icon {
  width: 26px;
  height: 26px;
}

.login-page__eyebrow {
  margin-bottom: 0.65rem;
}

.login-page__title {
  margin-bottom: 0.875rem;
  font-size: clamp(1.55rem, 2.8vw + 0.85rem, 2.05rem);
  font-weight: 650;
  letter-spacing: -0.038em;
  line-height: 1.12;
  overflow-wrap: anywhere;
}

.login-page__lede {
  margin: 0 auto;
  max-width: 34rem;
  font-size: 0.9525rem;
}

.login-page__rule {
  margin: 1.15rem auto 1.65rem;
  max-width: 12rem;
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--color-accent-strong) 45%, var(--color-divider)),
    transparent
  );
  height: 1px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.05rem;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 0.42rem;
  text-align: left;
}

.login-field__label-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.35rem 0.75rem;
}

.login-field__label-row .login-field__label {
  padding-left: 0.15rem;
}

.login-field__count {
  flex-shrink: 0;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  color: var(--color-text-subtle);
}

.login-field__label {
  padding-left: 0.15rem;
  letter-spacing: 0.02em;
}

.login-field__wrap {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-solid);
  box-shadow: inset 0 1px 2px color-mix(in srgb, var(--color-text-strong) 4%, transparent);
  transition:
    border-color 0.28s var(--ease-soft),
    box-shadow 0.28s var(--ease-soft),
    transform 0.28s var(--ease-soft);
}

.login-field__wrap:focus-within {
  border-color: color-mix(in srgb, var(--color-accent-strong) 52%, transparent);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--color-accent) 22%, transparent),
    inset 0 1px 2px color-mix(in srgb, var(--color-accent) 8%, transparent);
}

.login-field__glyph {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.38;
  color: var(--color-text-muted);
  pointer-events: none;
  transition: opacity 0.24s ease, color 0.24s ease;
}

.login-field__wrap:focus-within .login-field__glyph {
  opacity: 0.72;
  color: var(--color-accent-strong);
}

.login-field__wrap--password-actions .login-field__input {
  padding-right: 52px;
}

.login-field__wrap--password-actions:has(.login-field__clear) .login-field__input {
  padding-right: 96px;
}

.login-field__trailing {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 0;
}

.login-field__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 10px;
  color: var(--color-text-muted);
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    color 0.22s ease,
    background 0.22s ease,
    transform 0.22s var(--ease-soft);
}

.login-field__icon-btn:hover {
  color: var(--color-accent-strong);
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
}

.login-field__icon-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-surface-solid), 0 0 0 4px var(--color-focus-ring);
}

.login-field__icon-btn-glyph {
  width: 20px;
  height: 20px;
  pointer-events: none;
}

.login-field__input {
  flex: 1 1 0;
  width: 100%;
  min-width: 0;
  min-height: 50px;
  padding: 0 14px 0 46px;
  border: none;
  border-radius: inherit;
  outline: none;
  background: transparent;
  color: var(--color-text-strong);
  font-size: 0.935rem;
  letter-spacing: 0.01em;
}

.login-field__input::placeholder {
  color: color-mix(in srgb, var(--color-text-subtle) 85%, transparent);
}

.login-error {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  margin: -0.15rem 0 0;
  min-width: 0;
  overflow-wrap: anywhere;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-sm);
  font-size: 0.8625rem;
  line-height: 1.45;
  color: color-mix(in srgb, #b42318 82%, var(--color-text-strong));
  background: color-mix(in srgb, #b42318 9%, var(--color-surface-solid));
  border: 1px solid color-mix(in srgb, #b42318 22%, transparent);
}

:global(html.theme-dark) .login-error {
  color: color-mix(in srgb, #fca5a5 92%, white);
  background: color-mix(in srgb, #f87171 10%, var(--color-surface-solid));
  border-color: color-mix(in srgb, #f87171 26%, transparent);
}

.login-error__icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  opacity: 0.88;
}

.login-error-pop-enter-active,
.login-error-pop-leave-active {
  transition:
    opacity 0.28s var(--ease-soft),
    transform 0.32s var(--ease-out);
}

.login-error-pop-enter-from,
.login-error-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.login-submit {
  width: 100%;
  min-height: 50px;
  margin-top: 0.35rem;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
}

.login-submit::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    118deg,
    transparent 22%,
    color-mix(in srgb, white 35%, transparent) 48%,
    transparent 74%
  );
  opacity: 0;
  transform: translateX(-35%);
  transition: opacity 0.35s ease, transform 0.55s var(--ease-out);
}

.login-submit:hover::before {
  opacity: 0.55;
  transform: translateX(35%);
}

.login-submit__chev {
  opacity: 0.92;
  transition: transform 0.32s var(--ease-out);
}

.login-submit:hover .login-submit__chev {
  transform: translateX(4px);
}

.login-alt__label {
  margin: 0.25rem 0 0;
  text-align: center;
  letter-spacing: 0.12em;
  font-size: 0.8125rem;
}

.login-guest {
  width: 100%;
  min-height: 48px;
}

.login-guest__hint {
  margin: 0.55rem 0 0;
  text-align: center;
  font-size: 0.8125rem;
  line-height: 1.55;
  max-width: 34rem;
  margin-inline: auto;
}

@keyframes login-enter {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.985);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (max-width: 480px) {
  .login-shell__noise {
    inset: -4%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-page {
    animation: none;
  }

  .login-submit::before {
    display: none;
  }

  .login-submit:hover .login-submit__chev {
    transform: none;
  }
}
</style>
