<template>
  <div class="tab-page tab-page--subscribe">
    <section id="subscribe" class="subscribe-card surface-card surface-card--block" :style="subscribeParallaxStyle">
      <div class="subscribe-card__decor" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="0.85" opacity=".22">
          <path d="M8 46c8-24 26-38 46-42M12 54c14-26 38-42 54-52" stroke-linecap="round" />
          <circle cx="18" cy="18" r="4" /><circle cx="48" cy="22" r="3" /><circle cx="30" cy="40" r="2.25" />
        </svg>
      </div>
      <div>
        <p class="eyebrow">Newsletter</p>
        <h2 class="subscribe-title text-shimmer">订阅札记</h2>
        <p class="lede-secondary subscribe-lede">
          暂为前端占位交互；接入服务端或 Edge Function 后即可真实收集邮箱。
        </p>
      </div>
      <form class="subscribe-form" @submit.prevent="$emit('subscribe')">
        <input
          :value="email"
          type="email"
          placeholder="you@example.com"
          aria-label="邮箱地址"
          required
          @input="$emit('update:email', ($event.target as HTMLInputElement).value)"
        />
        <button class="btn btn-primary subscribe-submit" type="submit">订阅</button>
      </form>
      <p v-if="subscribeMessage" class="form-message meta-quiet">{{ subscribeMessage }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { StyleValue } from 'vue'

defineProps<{
  subscribeParallaxStyle: StyleValue
  email: string
  subscribeMessage: string
}>()

defineEmits<{
  subscribe: []
  'update:email': [v: string]
}>()
</script>
