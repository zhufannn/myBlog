import type { CSSProperties } from 'vue'
import { computed, type Ref } from 'vue'

/**
 * 将滚动偏移映射为微小的 translateY（px），并用 clamp 限制幅度，防止长页面位移过大。
 * factor 越大，同名区块「漂得越远」，保持各区块不同 factor 可叠出层次。
 */
function clampParallax(scrollY: number, factor: number, maxAbs: number): number {
  const raw = -scrollY * factor
  if (raw < -maxAbs) return -maxAbs
  if (raw > maxAbs) return maxAbs
  return raw
}

/** 传入响应式滚动值与各层系数，返回可直接绑定 :style 的 computed */
export function useParallaxLayer(
  scrollY: Ref<number>,
  factor: number,
  options?: { max?: number },
): computed<CSSProperties> {
  const max = options?.max ?? 52
  return computed(() => ({
    transform: `translate3d(0, ${clampParallax(scrollY.value, factor, max)}px, 0)`,
    willChange: 'transform',
  }))
}
