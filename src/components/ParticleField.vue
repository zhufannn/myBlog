<!--
  全屏画布粒子：体积随机 + 极慢漂移流场；
  指针进入引力半径后对鼠标做弹簧阻尼吸附（视觉上「跟着走」）；移出半径 / 离开窗口后只受流场 + 阻尼，缓慢回到平稳漂移（复位）。
  不依赖 tsParticles，交互语义完全可控。
-->
<template>
  <div class="particle-field-shell">
    <canvas ref="canvasRef" class="particle-field-inner" aria-hidden="true"></canvas>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    enabled: boolean
    /** 与 composable：移动端已减量 */
    count: number
    dark: boolean
    /** 系统「减少动效」：关闭鼠标吸附、减弱流场（但保持可见节点网） */
    gentle: boolean
  }>(),
  { enabled: true, count: 88, dark: true, gentle: false },
)

const canvasRef = ref<HTMLCanvasElement | null>(null)

let ctx: CanvasRenderingContext2D | null = null
let rafId = 0
let widthCss = 0
let heightCss = 0
let dpr = 1
let lastTs = 0

/** 指针是否在窗口内——移出后为 0，不再施加吸附力（缓慢复位相位） */
let pointerInside = false
let mx = 0
let my = 0

/** 每只粒子相位打散，避免出现整块同步平移的假流 */
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  ph: number
}

const particles: Particle[] = []

const particleTarget = computed(() => {
  const raw = Number(props.count)
  const n = Number.isFinite(raw) ? raw : 88
  return Math.max(28, Math.min(n, 160))
})

function smootherstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * x * (x * (x * 6 - 15) + 10)
}

function seedParticles(): void {
  particles.length = 0
  const n = particleTarget.value
  for (let i = 0; i < n; i += 1) {
    particles.push({
      x: Math.random() * Math.max(widthCss, 320),
      y: Math.random() * Math.max(heightCss, 320),
      vx: (Math.random() - 0.5) * 0.06,
      vy: (Math.random() - 0.5) * 0.06,
      r: 1.85 + Math.random() * 4.25,
      ph: Math.random() * Math.PI * 2,
    })
  }
}

function resize(): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  widthCss = Math.max(rect.width, window.innerWidth > 0 ? window.innerWidth : 0)
  heightCss = Math.max(rect.height, window.innerHeight > 0 ? window.innerHeight : 0)

  /* 避免首帧布局未结算出 0 宽高 */
  if (widthCss < 8 || heightCss < 8) {
    widthCss = window.innerWidth || 960
    heightCss = window.innerHeight || 640
  }

  dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.floor(widthCss * dpr)
  canvas.height = Math.floor(heightCss * dpr)
  ctx = canvas.getContext('2d', { alpha: true })
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  seedParticles()
}

/**
 * client 坐标需减掉 canvas 相对视口偏移，否则在有滚动条 / 非整屏时吸附错位，
 * 在浅色全宽布局下也会表现为「完全没跟着鼠标」。
 */
function onPointerMove(e: PointerEvent): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const r = canvas.getBoundingClientRect()
  mx = e.clientX - r.left
  my = e.clientY - r.top
  pointerInside = mx >= -24 && my >= -24 && mx <= r.width + 24 && my <= r.height + 24
}

/**
 * Capture 级别 mouseout：当指针离开浏览器窗口或进入非同页节点时，
 * relatedTarget 为 null / 不属于 document——此时取消吸附力，只靠阻尼缓慢回到漂移态。
 */

function onDocumentMouseOutCapturing(e: MouseEvent): void {
  const rt = e.relatedTarget
  if (rt === null) {
    pointerInside = false
    return
  }
  if (!(rt instanceof Node)) {
    pointerInside = false
    return
  }
  if (!document.documentElement.contains(rt)) pointerInside = false
}

function tick(now: number): void {
  rafId = requestAnimationFrame(tick)
  if (!props.enabled || !ctx || widthCss < 8) return

  const prev = lastTs || now
  lastTs = now
  /** 近似按 60fps 归一的倍率：避免高刷屏吸附过硬 */
  let dtFrames = (now - prev) / (1000 / 60)
  if (dtFrames > 2.45) dtFrames = 2.45
  if (dtFrames < 0.35) dtFrames = 1

  const t = now * 0.001

  const gentle = !!props.gentle

  /** 越深越「飘」慢一点；浅色主题提高对比（否则磨砂卡片后几乎不可见） */
  let flow = props.dark ? 0.032 : 0.03
  if (gentle) flow *= 0.28

  let damping = props.dark ? 0.978 : 0.976
  if (gentle) damping = 0.985

  /** 引力半径：越大越容易「沾上」光标 */
  const attractR = props.dark ? 210 : 188
  const springPerFrame = props.dark ? 0.078 : 0.07

  const linkCut = props.dark ? 128 : 118
  const linkRgb = props.dark ? '120,220,252' : '32,108,188'
  const linkBoost = props.dark ? 0.2 : 0.26
  const fillRgb = props.dark ? 'rgba(160,230,255,0.88)' : 'rgba(22,96,168,0.82)'

  ctx.clearRect(0, 0, widthCss, heightCss)

  /* --------- 邻近连线（低密度，避免整块糊成全白） --------- */
  for (let i = 0; i < particles.length; i += 1) {
    const a = particles[i]
    for (let j = i + 1; j < particles.length; j += 1) {
      const b = particles[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const dd = dx * dx + dy * dy
      if (dd >= linkCut * linkCut || dd < 1) continue
      const alpha = smootherstep01(1 - Math.sqrt(dd) / linkCut) * (gentle ? linkBoost * 0.65 : linkBoost)
      ctx.beginPath()
      ctx.strokeStyle = `rgba(${linkRgb},${alpha.toFixed(3)})`
      ctx.lineWidth = props.dark ? 1 : 1.15
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
  }

  /* --------- 动力学：环境流场 + （可选）指向鼠标的阻尼弹簧 --------- */
  for (const p of particles) {
    const gx = Math.sin(t * 0.45 + p.y * 0.00185 + p.ph) * flow
    const gy = Math.cos(t * 0.39 + p.x * 0.00175 + p.ph * 1.71) * flow

    p.vx += gx * dtFrames
    p.vy += gy * dtFrames

    if (!gentle && pointerInside) {
      const dx = mx - p.x
      const dy = my - p.y
      const distSq = dx * dx + dy * dy + 1e-4
      if (distSq < attractR * attractR) {
        const dist = Math.sqrt(distSq)
        const inward = smootherstep01(1 - dist / attractR)
        /** 越远越弱的线性过渡到弹簧力；近处更明显「吸附」 */
        const k = inward * inward * springPerFrame * dtFrames
        const inv = 1 / dist
        p.vx += dx * inv * k * attractR * 0.55
        p.vy += dy * inv * k * attractR * 0.55
      }
    }

    p.vx *= Math.pow(damping, dtFrames)
    p.vy *= Math.pow(damping, dtFrames)

    const sp = Math.hypot(p.vx, p.vy)
    const cap = props.dark ? 2.85 : 2.45
    if (sp > cap) {
      const s = cap / sp
      p.vx *= s
      p.vy *= s
    }

    p.x += p.vx * dtFrames
    p.y += p.vy * dtFrames

    if (p.x < -24) p.x = widthCss + 24
    else if (p.x > widthCss + 24) p.x = -24
    if (p.y < -24) p.y = heightCss + 24
    else if (p.y > heightCss + 24) p.y = -24
  }

  for (const p of particles) {
    ctx.beginPath()
    ctx.fillStyle = fillRgb
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
  }
}

watch(particleTarget, () => seedParticles())

watch(
  () => props.enabled,
  (on) => {
    if (on) {
      lastTs = 0
      resize()
      rafId = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(rafId)
      rafId = 0
      if (ctx && widthCss > 0 && heightCss > 0) ctx.clearRect(0, 0, widthCss, heightCss)
    }
  },
)

let ro: ResizeObserver | null = null

onMounted(() => {
  resize()
  if (props.enabled) {
    lastTs = 0
    rafId = requestAnimationFrame(tick)
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  document.addEventListener('mouseout', onDocumentMouseOutCapturing, true)
  window.addEventListener('blur', () => {
    pointerInside = false
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') pointerInside = false
  })
  ro = new ResizeObserver(() => resize())
  ro.observe(canvasRef.value as HTMLCanvasElement)
  requestAnimationFrame(() => resize())
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('mouseout', onDocumentMouseOutCapturing, true)
  ro?.disconnect()
})
</script>
