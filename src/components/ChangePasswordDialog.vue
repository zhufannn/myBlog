<!--
  顶部栏「修改密码」：更新 blog_users 中的 bcrypt 哈希。
-->
<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="pwd-dlg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwd-dlg-title"
      @click.self="close"
    >
      <div class="pwd-dlg__panel surface-card">
        <header class="pwd-dlg__head">
          <h2 id="pwd-dlg-title" class="text-shimmer pwd-dlg__title">修改密码</h2>
          <button type="button" class="pwd-dlg__x" aria-label="关闭" @click="close">×</button>
        </header>
        <p class="meta-quiet pwd-dlg__hint">新密码写入数据库（bcrypt）；修改后请用新密码登录。</p>
        <form class="pwd-dlg__form" @submit.prevent="submit">
          <label class="pwd-dlg__field">
            <span class="meta-quiet">原密码</span>
            <input v-model="oldPass" class="pwd-dlg__input" type="password" autocomplete="current-password" required />
          </label>
          <label class="pwd-dlg__field">
            <span class="meta-quiet">新密码</span>
            <input v-model="newPass" class="pwd-dlg__input" type="password" autocomplete="new-password" required />
          </label>
          <label class="pwd-dlg__field">
            <span class="meta-quiet">确认新密码</span>
            <input v-model="newPass2" class="pwd-dlg__input" type="password" autocomplete="new-password" required />
          </label>
          <p v-if="err" class="pwd-dlg__err" role="alert">{{ err }}</p>
          <div class="pwd-dlg__actions">
            <button type="button" class="btn btn-ghost" @click="close">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? '保存中…' : '保存' }}</button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { changeMemberPasswordRemote, type MemberId } from '../composables/useBlogAuth'

const props = defineProps<{
  open: boolean
  memberId: MemberId
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const oldPass = ref('')
const newPass = ref('')
const newPass2 = ref('')
const err = ref('')
const saving = ref(false)

watch(
  () => props.open,
  (v) => {
    if (v) {
      oldPass.value = ''
      newPass.value = ''
      newPass2.value = ''
      err.value = ''
    }
  },
)

function close(): void {
  emit('close')
}

async function submit(): Promise<void> {
  err.value = ''
  if (newPass.value !== newPass2.value) {
    err.value = '两次输入的新密码不一致'
    return
  }
  saving.value = true
  try {
    const r = await changeMemberPasswordRemote(props.memberId, oldPass.value, newPass.value)
    if (!r.ok) {
      err.value = r.error
      return
    }
    emit('success')
    emit('close')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.pwd-dlg {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: grid;
  place-items: center;
  padding: max(1rem, env(safe-area-inset-top, 0px)) max(1rem, env(safe-area-inset-right, 0px))
    max(1rem, env(safe-area-inset-bottom, 0px)) max(1rem, env(safe-area-inset-left, 0px));
  background: color-mix(in srgb, var(--color-text-strong) 35%, transparent);
  backdrop-filter: blur(8px);
}

.pwd-dlg__panel {
  width: min(400px, 100%);
  max-width: 100%;
  padding: 1.15rem 1.2rem 1.25rem;
  border-radius: var(--radius-lg);
  box-sizing: border-box;
}

.pwd-dlg__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
}

.pwd-dlg__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 650;
}

.pwd-dlg__x {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  margin: -0.35rem -0.25rem 0 0;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.pwd-dlg__x:hover {
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  color: var(--color-text-strong);
}

.pwd-dlg__hint {
  margin: 0 0 1rem;
  font-size: 0.8125rem;
  line-height: 1.55;
}

.pwd-dlg__form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.pwd-dlg__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.pwd-dlg__input {
  min-height: 46px;
  padding: 0 0.85rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-solid);
  color: var(--color-text-strong);
  font: inherit;
  font-size: 0.935rem;
  width: 100%;
  box-sizing: border-box;
}

.pwd-dlg__input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--color-accent-strong) 52%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 22%, transparent);
}

.pwd-dlg__err {
  margin: 0;
  padding: 0.55rem 0.65rem;
  border-radius: var(--radius-sm);
  font-size: 0.8625rem;
  color: color-mix(in srgb, #b42318 82%, var(--color-text-strong));
  background: color-mix(in srgb, #b42318 9%, var(--color-surface-solid));
  border: 1px solid color-mix(in srgb, #b42318 22%, transparent);
}

.pwd-dlg__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.pwd-dlg__actions .btn {
  min-height: 44px;
}
</style>
