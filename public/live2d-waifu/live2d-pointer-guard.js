/**
 * 阻止旧版 Live2D（live2d.js）往 window / document 上挂全局指针监听。
 * 跟随时会触发 WebGL 遮罩与纹理不同步，表现为头部、头发「消失」只剩五官。
 * 必须在 live2d.js 之前同步加载。
 */
;(function () {
  if (window.__live2dPointerGuardInstalled) return
  window.__live2dPointerGuardInstalled = true

  var orig = EventTarget.prototype.addEventListener
  var pointerTypes = {
    mousemove: 1,
    mousedown: 1,
    mouseup: 1,
    mouseout: 1,
    mousewheel: 1,
    touchstart: 1,
    touchmove: 1,
    touchend: 1,
  }

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (listener && typeof listener === 'function' && pointerTypes[type]) {
      try {
        if (String(listener).indexOf('Sleepy') !== -1) {
          return
        }
      } catch (_e) {
        /* ignore */
      }
    }
    return orig.apply(this, arguments)
  }
})()
