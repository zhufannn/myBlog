<template>
  <Teleport to="body">
    <div ref="rootRef" class="live2d-waifu-root" aria-hidden="true">
      <input
        id="waifu-talk"
        type="text"
        class="waifu-talk"
        placeholder="和她聊聊，回车发送"
        autocomplete="off"
      />
      <div class="waifu">
        <div class="waifu-tips"></div>
        <div class="waifu-tool">
          <span data-act="home" title="回到顶部">🏠</span>
          <span data-act="switch" title="切换角色">👁</span>
          <span data-act="chat" title="一言">💬</span>
          <span data-act="costume" title="换装">👗</span>
          <span data-act="photo" title="截取画框">📷</span>
          <span data-act="close" title="隐藏看板娘">✕</span>
        </div>
        <canvas
          id="live2d"
          ref="canvasRef"
          width="300"
          height="520"
          class="live2d"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import * as PIXI from 'pixi.js'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

/** cubism2 包在加载时会检测 window.Live2D，必须先注入 live2d.min.js 再动态 import */
type Live2DModelClass = (typeof import('pixi-live2d-display/cubism2'))['Live2DModel']
type Live2DModelInstance = InstanceType<Live2DModelClass>

const WAIFU_BASE = '/live2d-waifu/'
const CUBISM2_CORE = 'https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js'
const MODEL_ASPECT = 520 / 300

const rootRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let dragCleanup: (() => void) | null = null

let app: PIXI.Application | null = null
let Live2DModel: Live2DModelClass | null = null
let currentModel: Live2DModelInstance | null = null
let resizeObserver: ResizeObserver | null = null
const previousPixi = typeof window !== 'undefined' ? window.PIXI : undefined

function injectStylesheet(href: string): void {
  const id = 'live2d-waifu-styles'
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = false
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

function layoutModel(model: Live2DModelInstance, rw: number, rh: number): void {
  const mw = Math.max(1, model.width)
  const mh = Math.max(1, model.height)
  const scale = Math.min(rw / mw, rh / mh)
  model.scale.set(scale)
  model.anchor.set(0.5, 1)
  model.position.set(rw / 2, rh)
}

/** 父级曾为 display:none 时 canvas.clientWidth 为 0，需从容器或 CSS 逻辑宽度回退 */
function readCanvasDisplayWidth(canvas: HTMLCanvasElement): number {
  let w = Math.floor(canvas.clientWidth)
  if (w >= 2) return w
  const wrap = canvas.closest('.waifu') ?? canvas.parentElement
  if (wrap) {
    const rect = wrap.getBoundingClientRect()
    w = Math.floor(rect.width)
    if (w >= 2) return w
  }
  const approx = Math.min(300, Math.max(120, Math.floor(window.innerWidth * 0.42)))
  return Math.max(2, approx)
}

function resizeStageToCanvas(canvas: HTMLCanvasElement): void {
  if (!app) return
  const rw = readCanvasDisplayWidth(canvas)
  const rh = Math.max(1, Math.floor(rw * MODEL_ASPECT))
  app.renderer.resize(rw, rh)
  if (currentModel) {
    layoutModel(currentModel, rw, rh)
  }
}

/** 库只提供视线 focus / 点击命中，不包含拖动整个挂件；在 canvas 上拖动文档中的根节点 */
function setupWaifuDrag(): void {
  dragCleanup?.()
  dragCleanup = null

  const canvas = canvasRef.value
  const root = rootRef.value
  if (!canvas || !root) return

  const st = { active: false, sx: 0, sy: 0, sl: 0, sb: 0 }

  const onDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    const r = root.getBoundingClientRect()
    st.active = true
    st.sx = e.clientX
    st.sy = e.clientY
    st.sl = r.left
    st.sb = window.innerHeight - r.bottom
    canvas.style.touchAction = 'none'
    try {
      canvas.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const onMove = (e: PointerEvent): void => {
    if (!st.active) return
    const dx = e.clientX - st.sx
    const dy = e.clientY - st.sy
    root.style.left = `${st.sl + dx}px`
    root.style.right = 'auto'
    root.style.bottom = `${st.sb - dy}px`
  }

  const onEnd = (e: PointerEvent): void => {
    if (!st.active) return
    st.active = false
    canvas.style.touchAction = ''
    try {
      canvas.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onEnd)
  canvas.addEventListener('pointercancel', onEnd)

  dragCleanup = () => {
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerup', onEnd)
    canvas.removeEventListener('pointercancel', onEnd)
  }
}

async function mountPixiApp(): Promise<void> {
  const canvas = canvasRef.value
  if (!canvas) return

  window.PIXI = PIXI

  const rw0 = readCanvasDisplayWidth(canvas)
  const rh0 = Math.max(1, Math.floor(rw0 * MODEL_ASPECT))

  app = new PIXI.Application({
    view: canvas,
    width: rw0,
    height: rh0,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  })

  app.stage.interactive = true

  resizeObserver = new ResizeObserver(() => {
    if (!canvasRef.value || !app) return
    resizeStageToCanvas(canvasRef.value)
  })
  resizeObserver.observe(canvas)
  const waifuWrap = canvas.closest('.waifu')
  if (waifuWrap) {
    resizeObserver.observe(waifuWrap)
  }

  setupWaifuDrag()

  window.__waifuLoadModel = (modelUrl: string) => {
    void loadModelFromUrl(modelUrl)
  }

  window.__waifuTakeScreenshot = () => {
    if (!app) return
    try {
      const extract = app.renderer.plugins.extract as {
        canvas: (displayObject: PIXI.DisplayObject) => HTMLCanvasElement
      }
      const snap = extract.canvas(app.stage)
      const url = snap.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = 'waifu.png'
      a.rel = 'noopener'
      a.click()
    } catch (e) {
      console.warn('[Live2D] screenshot failed', e)
    }
  }
}

function setWaifuModelLoading(active: boolean): void {
  const canvas = canvasRef.value
  const wrap = canvas?.closest('.waifu')
  wrap?.classList.toggle('waifu--model-loading', active)
}

async function loadModelFromUrl(modelUrl: string): Promise<void> {
  if (!app || !Live2DModel) return
  const hadModel = !!currentModel
  try {
    if (hadModel) {
      setWaifuModelLoading(true)
    }
    if (currentModel) {
      app.stage.removeChild(currentModel)
      currentModel.destroy({ texture: true, baseTexture: true })
      currentModel = null
    }
    const model = await Live2DModel.from(modelUrl)
    currentModel = model
    app.stage.addChild(model)
    if (canvasRef.value) {
      resizeStageToCanvas(canvasRef.value)
      app.renderer.render(app.stage)
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setWaifuModelLoading(false)
      })
    })
    console.log('[Live2D] 模型加载完成', modelUrl)
  } catch (e) {
    console.warn('[Live2D] 模型加载失败', e)
    setWaifuModelLoading(false)
  }
}

function teardownPixi(): void {
  resizeObserver?.disconnect()
  resizeObserver = null

  dragCleanup?.()
  dragCleanup = null

  Live2DModel = null

  if (currentModel) {
    try {
      currentModel.destroy({ texture: true, baseTexture: true })
    } catch {
      /* ignore */
    }
    currentModel = null
  }

  if (app) {
    try {
      app.destroy(true, { children: true, texture: true, baseTexture: true })
    } catch {
      /* ignore */
    }
    app = null
  }

  delete window.__waifuLoadModel
  delete window.__waifuTakeScreenshot
  delete window.__waifuRefreshDisplay
  if (previousPixi !== undefined) {
    window.PIXI = previousPixi
  } else {
    delete window.PIXI
  }
}

onMounted(async () => {
  injectStylesheet(`${WAIFU_BASE}waifu-widget.css`)
  await nextTick()
  try {
    await loadScript(CUBISM2_CORE)
    if (typeof (window as unknown as { Live2D?: unknown }).Live2D === 'undefined') {
      throw new Error('live2d.min.js 已请求但未暴露 window.Live2D，请检查脚本地址或网络')
    }
    window.PIXI = PIXI
    const cubism = await import('pixi-live2d-display/cubism2')
    Live2DModel = cubism.Live2DModel
    await mountPixiApp()

    window.__waifuRefreshDisplay = (): void => {
      const canvas = canvasRef.value
      if (!app || !canvas) return
      resizeStageToCanvas(canvas)
      app.renderer.render(app.stage)
    }

    await loadScript('https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js')
    await loadScript(`${WAIFU_BASE}waifu-widget.js`)
    const start = window.startLive2dWaifu
    start?.(WAIFU_BASE)
  } catch (e) {
    console.warn('[Live2D] failed to load', e)
    teardownPixi()
  }
})

onBeforeUnmount(() => {
  teardownPixi()
})
</script>
