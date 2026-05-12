import { computed, onMounted, onUnmounted, ref } from 'vue'

/**
 * 集中判断「是否应该启用重动画」的运行环境：
 * - 粒子背景默认始终挂载；系统「减少动效」时仅以 gentle 模式减弱流场与鼠标吸附（见 ParticleField）
 * - 视差在减少动效时关闭
 */
export function useFxEnvironment() {
  const prefersReducedMotion = ref(false)
  const narrowViewport = ref(false)

  /** 是否在视觉舒适模式下运行（不重动画） */
  const reduceMotionEffective = prefersReducedMotion

  let mqMotion: MediaQueryList | null = null

  /** 监听媒体特性与窗口尺寸，统一管理副作用 */
  const sync = (): void => {
    prefersReducedMotion.value = mqMotion?.matches ?? false
    narrowViewport.value = window.innerWidth <= 719
  }

  /** 挂载时注册监听，卸载时移除，避免幽灵回调 */
  onMounted(() => {
    mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    mqMotion.addEventListener?.('change', sync)
    window.addEventListener('resize', sync, { passive: true })
    sync()
  })

  onUnmounted(() => {
    mqMotion?.removeEventListener?.('change', sync)
    window.removeEventListener('resize', sync)
  })

  /** 粒子网：不因「减少动效」整体关闭（否则背景只剩纯色）；由粒子组件自行降采样 / 关吸附 */
  const showParticles = computed(() => true)

  const particleGentle = computed(() => prefersReducedMotion.value)

  const particleBudget = computed(() =>
    narrowViewport.value ? 52 : 108,
  )

  /** 视差仅在非减少动效时启用，减轻低配设备滚动压力 */
  const showScrollParallax = computed(() => !prefersReducedMotion.value)

  return {
    reduceMotionEffective,
    narrowViewport,
    showParticles,
    particleGentle,
    particleBudget,
    showScrollParallax,
  }
}
