declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

import type * as PIXI from 'pixi.js'

declare global {
  interface Window {
    PIXI?: typeof PIXI
    __waifuLoadModel?: (url: string) => void
    __waifuTakeScreenshot?: () => void
    /** 折叠后恢复时重算 Pixi 尺寸并重绘 */
    __waifuRefreshDisplay?: () => void
    /** 折叠看板娘（由 waifu-widget 关闭按钮调用，不销毁 Pixi） */
    __waifuMinimize?: () => void
    __waifuIsMinimized?: () => boolean
    startLive2dWaifu?: (basePath: string) => void
  }
}
