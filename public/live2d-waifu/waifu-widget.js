/**
 * Live2D 看板娘逻辑（基于 live2d_ai / waifu-tips 思路改写）
 * - 模型与换装：live2d.alpaca.run 公共接口
 * - 一言：v1.hitokoto.cn（仅 GET，无需后端）
 * - 不包含原项目中的图片审核、需 Key 的聊天接口
 *
 * 依赖：页面宿主注入 window.__waifuLoadModel（Pixi + pixi-live2d-display），并先加载 Cubism2 的 live2d.min.js；再加载 jQuery 与本脚本。
 */
/* global $, jQuery */

String.prototype.render = function (context) {
  var tokenReg = /(\\)?\{([^{}\\]+)(\\)?\}/g

  return this.replace(tokenReg, function (word, slash1, token, slash2) {
    if (slash1 || slash2) {
      return word.replace('\\', '')
    }

    var variables = token.replace(/\s/g, '').split('.')
    var currentObject = context
    var i, length, variable

    for (i = 0, length = variables.length; i < length; ++i) {
      variable = variables[i]
      currentObject = currentObject[variable]
      if (currentObject === undefined || currentObject === null) return ''
    }
    return currentObject
  })
}

function pickText(arr) {
  if (!arr || !arr.length) return ''
  return arr[Math.floor(Math.random() * arr.length)]
}

function showMessage(text, timeout, flag) {
  if (flag || sessionStorage.getItem('waifu-text') === '' || sessionStorage.getItem('waifu-text') === null) {
    if (Array.isArray(text)) text = pickText(text)

    if (flag) sessionStorage.setItem('waifu-text', text)

    $('.live2d-waifu-root .waifu-tips').stop()
    $('.live2d-waifu-root .waifu-tips').html(text).fadeTo(200, 1)
    if (timeout === undefined) timeout = 5000
    hideMessage(timeout)
  }
}

function hideMessage(timeout) {
  $('.live2d-waifu-root .waifu-tips').stop().css('opacity', 1)
  if (timeout === undefined) timeout = 5000
  window.setTimeout(function () {
    sessionStorage.removeItem('waifu-text')
  }, timeout)
  $('.live2d-waifu-root .waifu-tips').delay(timeout).fadeTo(200, 0)
}

function showHitokoto() {
  $.getJSON('https://v1.hitokoto.cn?encode=jsc')
    .done(function (result) {
      var text =
        '出自 <span style="color:#0099cc;">『' +
        (result.from || '一言') +
        '』</span>：'
      showMessage(result.hitokoto, 5500)
      window.setTimeout(function () {
        showMessage(text, 4000)
      }, 5200)
    })
    .fail(function () {
      showMessage('一言服务暂时_unreachable，摸摸我继续玩吧~', 4500)
    })
}

/**
 * 使用 unpkg 上 NPM 包 live2d-widget-model-* 的 model.json（贴图相对路径可解析）。
 * Alpaca 公益接口常超时/失效，会导致画布空白仅有 UI。
 */
var WAIFU_MODELS = [
  {
    url: 'https://unpkg.com/live2d-widget-model-shizuku@1.0.1/assets/shizuku.model.json',
    name: 'Shizuku',
  },
  {
    url: 'https://unpkg.com/live2d-widget-model-hijiki@1.0.0/assets/hijiki.model.json',
    name: 'Hijiki',
  },
  {
    url: 'https://unpkg.com/live2d-widget-model-tororo@1.0.0/assets/tororo.model.json',
    name: 'Tororo',
  },
]

var STORAGE_MODEL_IDX = 'waifu-model-idx-v2'
var WAIFU_RESTORE_ID = 'live2d-waifu-restore'
/** 是否已绑定工具栏 / 一言 / tips / 复制 / 空闲逻辑（仅应执行一次） */
var waifuBindingsDone = false

function getModelIndex() {
  var raw = localStorage.getItem(STORAGE_MODEL_IDX)
  var i = parseInt(raw, 10)
  if (isNaN(i) || i < 0) return 0
  return i % WAIFU_MODELS.length
}

function setModelIndex(i) {
  localStorage.setItem(STORAGE_MODEL_IDX, String(i))
}

function loadModelFromUrl(modelUrl) {
  var load = window.__waifuLoadModel
  if (typeof load === 'function') {
    load(modelUrl)
    return
  }
  console.error('__waifuLoadModel 未注入：请使用 Pixi 宿主加载 Live2D')
  showMessage('Live2D 未就绪，刷新页面试试', 6000, true)
}

function loadModelAtIndex(idx, silent) {
  idx = ((idx % WAIFU_MODELS.length) + WAIFU_MODELS.length) % WAIFU_MODELS.length
  setModelIndex(idx)
  var m = WAIFU_MODELS[idx]
  loadModelFromUrl(m.url)
  if (!silent) {
    window.setTimeout(function () {
      showMessage('现在是「' + m.name + '」~', 3200, true)
    }, 400)
  }
}

/** 从隐藏恢复后：强制按当前索引重载模型（WebGL / 尺寸在 display:none 后易脏） */
function reloadStoredWaifuModel() {
  var load = window.__waifuLoadModel
  if (typeof load !== 'function') return
  var idx = getModelIndex()
  var m = WAIFU_MODELS[idx % WAIFU_MODELS.length]
  if (!m) return
  load(m.url)
}

function loadOtherModel() {
  loadModelAtIndex(getModelIndex() + 1, false)
}

function loadRandModel() {
  showMessage('静态模型包以「换人」为主～点眼睛按钮切换角色试试', 4500, true)
}

function initModel(waifuPath) {
  if (waifuPath === undefined) waifuPath = '/live2d-waifu/'
  loadModelAtIndex(getModelIndex(), true)

  $.ajax({
    cache: true,
    url: waifuPath + 'waifu-tips.json',
    dataType: 'json',
    success: function (result) {
      $.each(result.mouseover || [], function (_index, tips) {
        $(document).on('mouseover', tips.selector, function () {
          var text = tips.text
          if (Array.isArray(text)) text = pickText(text)
          text = text.render({ text: $(this).text() })
          showMessage(text, 3500)
        })
      })
      $.each(result.click || [], function (_index, tips) {
        $(document).on('click', tips.selector, function () {
          var text = tips.text
          if (Array.isArray(text)) text = pickText(text)
          text = text.render({ text: $(this).text() })
          showMessage(text, 3500, true)
        })
      })
      $.each(result.seasons || [], function (_index, tips) {
        var now = new Date()
        var after = tips.date.split('-')[0]
        var before = tips.date.split('-')[1] || after
        if (
          after.split('/')[0] <= now.getMonth() + 1 &&
          now.getMonth() + 1 <= before.split('/')[0] &&
          after.split('/')[1] <= now.getDate() &&
          now.getDate() <= before.split('/')[1]
        ) {
          var text = tips.text
          if (Array.isArray(text)) text = pickText(text)
          text = text.render({ year: now.getFullYear() })
          showMessage(text, 6000, true)
        }
      })
    },
  })
}

function bindWaifuTools($root, basePath) {
  if (basePath === undefined) basePath = '/live2d-waifu/'
  $root.find('[data-act="home"]').on('click', function () {
    var top = document.getElementById('layout-top')
    if (top) {
      top.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    showMessage('嗒哒，回到顶部~', 2000, true)
  })

  $root.find('[data-act="switch"]').on('click', function () {
    loadOtherModel()
  })

  $root.find('[data-act="chat"]').on('click', function () {
    showHitokoto()
  })

  $root.find('[data-act="costume"]').on('click', function () {
    loadRandModel()
  })

  $root.find('[data-act="photo"]').on('click', function () {
    var shot = window.__waifuTakeScreenshot
    if (typeof shot === 'function') {
      try {
        shot()
      } catch (_e) {
        /* ignore */
      }
    }
    showMessage('已试着截取画布一帧（若浏览器拦截下载属于正常防护）', 4500, true)
  })

  $root.find('[data-act="close"]').on('click', function () {
    sessionStorage.setItem('waifu-display', 'none')
    showMessage('那我先躲起来啦，点侧边小图标可以叫我回来喔~', 2800, true)
    window.setTimeout(function () {
      $root.hide()
      mountRestoreFab(basePath)
    }, 800)
  })
}

function bindTalkInput() {
  $('#waifu-talk').on('keydown', function (e) {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault()
      var text = $(this).val().trim()
      $(this).val('')
      if (!text.length) {
        showMessage('先写点什么再按回车嘛~', 2500, true)
        return
      }
      showMessage('你说的是：「' + $('<div/>').text(text).html() + '」？我先记在小本本上~', 5000, true)
      $.getJSON('https://v1.hitokoto.cn?encode=jsc&c=a')
        .done(function (res) {
          window.setTimeout(function () {
            showMessage('送你一句：' + res.hitokoto, 6000)
          }, 900)
        })
        .fail(function () {
          window.setTimeout(function () {
            showMessage('一言暂时不可用，但你的心意我收到啦', 4000)
          }, 900)
        })
    }
  })
}

function waifuWelcomeBanner() {
  var titlePart = document.title.split(' - ')[0] || '这里'
  var text =
    '欢迎来到 <span style="color:#0099cc;">『' + titlePart + '』</span>，今天也要加油喵~'
  showMessage(text, 6500)
}

/** 空闲一言（轻量，不打扰阅读） */
function setupIdleHitokoto() {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  } catch (_e) {
    /* ignore */
  }
  var idleTimer = 0
  window.setInterval(function () {
    idleTimer += 1
    if (idleTimer >= 120) {
      idleTimer = 0
      if (document.hidden) return
      showHitokoto()
    }
  }, 1000)
  $(document).on('mousemove keydown scroll touchstart', function () {
    idleTimer = 0
  })
}

/** —— 唤起按钮：可拖拽、左右贴边吸附；贴边时悬浮探出，离开后收回；离边则保持自由位置 —— */
var WAIFU_RESTORE_FAB_STORAGE_KEY = 'waifu-restore-fab-v1'
/** 距左/右边缘小于此值视为贴边吸附（px） */
var WAIFU_RESTORE_SNAP_PX = 76
/** 与 CSS 中按钮尺寸保持一致 */
var WAIFU_RESTORE_BTN = 56
var WAIFU_RESTORE_DRAG_THRESH = 8
var WAIFU_RESTORE_ICON_SRC = '/kabi.svg'

function clampNum(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

function getDefaultWaifuRestoreFabState() {
  return {
    type: 'snap',
    edge: 'left',
    top: window.innerHeight - WAIFU_RESTORE_BTN - 18,
  }
}

function normalizeWaifuRestoreFabState(raw) {
  if (!raw || typeof raw !== 'object') return getDefaultWaifuRestoreFabState()
  if (raw.type === 'free' && typeof raw.left === 'number' && typeof raw.top === 'number') {
    return { type: 'free', left: raw.left, top: raw.top }
  }
  if (raw.type === 'snap' && (raw.edge === 'left' || raw.edge === 'right') && typeof raw.top === 'number') {
    return { type: 'snap', edge: raw.edge, top: raw.top }
  }
  return getDefaultWaifuRestoreFabState()
}

function clampTopForRestoreFab(top) {
  var vh = window.innerHeight
  var m = 10
  return clampNum(top, m, vh - WAIFU_RESTORE_BTN - m)
}

function clampFreeRestoreFabPos(left, top) {
  var vw = window.innerWidth
  var vh = window.innerHeight
  var s = WAIFU_RESTORE_BTN
  return {
    left: clampNum(left, 8, vw - s - 8),
    top: clampNum(top, 8, vh - s - 8),
  }
}

/** 从 localStorage 读出并规范化 */
function loadWaifuRestoreFabState() {
  try {
    var j = localStorage.getItem(WAIFU_RESTORE_FAB_STORAGE_KEY)
    return normalizeWaifuRestoreFabState(j ? JSON.parse(j) : null)
  } catch (_e) {
    return getDefaultWaifuRestoreFabState()
  }
}

function persistWaifuRestoreFabState(state) {
  try {
    localStorage.setItem(WAIFU_RESTORE_FAB_STORAGE_KEY, JSON.stringify(normalizeWaifuRestoreFabState(state)))
  } catch (_e) {
    /* ignore */
  }
}

function applyWaifuRestoreFabState(btnEl, state) {
  var $b = $(btnEl)
  state = normalizeWaifuRestoreFabState(state)
  btnEl.classList.remove(
    'live2d-waifu-restore--snap-left',
    'live2d-waifu-restore--snap-right',
    'live2d-waifu-restore--free',
  )

  if (state.type === 'snap') {
    var t = clampTopForRestoreFab(state.top)
    if (state.edge === 'left') {
      btnEl.classList.add('live2d-waifu-restore--snap-left')
      $b.css({ left: 0, top: t, right: 'auto', bottom: 'auto', transform: '' })
    } else {
      btnEl.classList.add('live2d-waifu-restore--snap-right')
      $b.css({ left: 'auto', right: 0, top: t, bottom: 'auto', transform: '' })
    }
    return
  }
  var pos = clampFreeRestoreFabPos(state.left, state.top)
  btnEl.classList.add('live2d-waifu-restore--free')
  $b.css({
    left: pos.left,
    top: pos.top,
    right: 'auto',
    bottom: 'auto',
    transform: 'none',
  })
}

function performWaifuRestoreFromFab(basePath) {
  sessionStorage.removeItem('waifu-display')
  removeRestoreFab()
  /** 召回前若已初始化过，只需 resize+重载；否则让 ensureWaifuBindings 里的 initModel 单独加载，避免双加载闪屏 */
  var alreadyActivated = waifuBindingsDone
  $('.live2d-waifu-root').show()
  ensureWaifuBindings(basePath)

  var refresh = window.__waifuRefreshDisplay
  function doRefresh() {
    if (typeof refresh === 'function') refresh()
  }

  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(function () {
      doRefresh()
    })
  })

  window.setTimeout(function () {
    if (alreadyActivated) {
      reloadStoredWaifuModel()
    } else {
      doRefresh()
    }
  }, 120)

  window.setTimeout(function () {
    showMessage('又见面啦~', 3200, true)
  }, 400)
}

function bindWaifuRestoreFabInteractions($btn, basePath) {
  var el = $btn[0]
  var dragging = false
  var moved = false
  var ignoreNextClick = false
  var ptrId = null
  var ox = 0
  var oy = 0
  var startCX = 0
  var startCY = 0

  function finalizeDragOrSnap() {
    var rect = el.getBoundingClientRect()
    var cw = window.innerWidth
    var dL = rect.left
    var dR = cw - rect.right

    var snapL = dL <= WAIFU_RESTORE_SNAP_PX
    var snapR = dR <= WAIFU_RESTORE_SNAP_PX

    if (snapL && (!snapR || dL < dR)) {
      var stL = { type: 'snap', edge: 'left', top: rect.top }
      persistWaifuRestoreFabState(stL)
      applyWaifuRestoreFabState(el, stL)
      return
    }
    if (snapR) {
      var stR = { type: 'snap', edge: 'right', top: rect.top }
      persistWaifuRestoreFabState(stR)
      applyWaifuRestoreFabState(el, stR)
      return
    }
    var stF = { type: 'free', left: rect.left, top: rect.top }
    persistWaifuRestoreFabState(stF)
    applyWaifuRestoreFabState(el, stF)
  }

  el.addEventListener(
    'pointerdown',
    function (e) {
      if (e.button !== 0) return
      dragging = true
      moved = false
      startCX = e.clientX
      startCY = e.clientY
      var r = el.getBoundingClientRect()
      ox = e.clientX - r.left
      oy = e.clientY - r.top
      ptrId = e.pointerId
      el.classList.add('live2d-waifu-restore--dragging')
      try {
        el.setPointerCapture(ptrId)
      } catch (_e) {
        /* ignore */
      }
    },
    { passive: true },
  )

  el.addEventListener('pointermove', function (e) {
    if (!dragging || e.pointerId !== ptrId) return
    if (
      Math.abs(e.clientX - startCX) > WAIFU_RESTORE_DRAG_THRESH ||
      Math.abs(e.clientY - startCY) > WAIFU_RESTORE_DRAG_THRESH
    ) {
      if (!moved) {
        moved = true
        el.classList.remove('live2d-waifu-restore--snap-left', 'live2d-waifu-restore--snap-right')
        el.classList.add('live2d-waifu-restore--free')
      }
      var nl = e.clientX - ox
      var nt = e.clientY - oy
      var pos = clampFreeRestoreFabPos(nl, nt)
      $btn.css({
        left: pos.left,
        top: pos.top,
        right: 'auto',
        bottom: 'auto',
        transform: 'none',
      })
    }
  })

  el.addEventListener('pointerup', function (e) {
    if (!dragging || e.pointerId !== ptrId) return
    dragging = false
    el.classList.remove('live2d-waifu-restore--dragging')
    try {
      el.releasePointerCapture(e.pointerId)
    } catch (_err) {
      /* ignore */
    }
    ptrId = null

    if (moved) {
      ignoreNextClick = true
      window.setTimeout(function () {
        ignoreNextClick = false
      }, 80)
      finalizeDragOrSnap()
      moved = false
      return
    }
    moved = false
  })

  el.addEventListener('pointercancel', function (e) {
    if (e.pointerId !== ptrId && ptrId != null) return
    dragging = false
    ptrId = null
    el.classList.remove('live2d-waifu-restore--dragging')
    moved = false
  })

  el.addEventListener('click', function (e) {
    if (ignoreNextClick) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    e.preventDefault()
    performWaifuRestoreFromFab(basePath)
  })

  el.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      performWaifuRestoreFromFab(basePath)
    }
  })
}

function attachWaifuRestoreFabResizeHandler() {
  var t = 0
  $(window)
    .off('resize.waifuRestoreFab')
    .on('resize.waifuRestoreFab', function () {
      window.clearTimeout(t)
      t = window.setTimeout(function () {
        var btn = document.getElementById(WAIFU_RESTORE_ID)
        if (!btn) return
        var state = loadWaifuRestoreFabState()
        if (state.type === 'snap') {
          state.top = clampTopForRestoreFab(state.top)
        } else if (state.type === 'free') {
          var p = clampFreeRestoreFabPos(state.left, state.top)
          state.left = p.left
          state.top = p.top
        }
        persistWaifuRestoreFabState(state)
        applyWaifuRestoreFabState(btn, state)
      }, 100)
    })
}

function removeRestoreFab() {
  $(window).off('resize.waifuRestoreFab')
  $('#' + WAIFU_RESTORE_ID).remove()
}

function mountRestoreFab(basePath) {
  if (document.getElementById(WAIFU_RESTORE_ID)) return

  var $btn = $(
    '<button type="button" id="' +
      WAIFU_RESTORE_ID +
      '" class="live2d-waifu-restore" aria-label="显示看板娘">' +
      '<img src="' +
      WAIFU_RESTORE_ICON_SRC +
      '" class="live2d-waifu-restore__img" width="44" height="44" draggable="false" alt="" decoding="async" />' +
      '</button>',
  )
  $('body').append($btn)

  var el = $btn[0]
  applyWaifuRestoreFabState(el, loadWaifuRestoreFabState())
  bindWaifuRestoreFabInteractions($btn, basePath)
  attachWaifuRestoreFabResizeHandler()
}

function ensureWaifuBindings(basePath) {
  if (waifuBindingsDone) return
  waifuBindingsDone = true
  if (basePath === undefined) basePath = '/live2d-waifu/'
  var $root = $('.live2d-waifu-root')
  bindWaifuTools($root, basePath)
  bindTalkInput()
  initModel(basePath)

  $(document).on('copy', function () {
    showMessage('复制成功，程序员必备技能 get~', 4000, true)
  })

  setupIdleHitokoto()
}

function startLive2dWaifu(basePath) {
  if (basePath === undefined) basePath = '/live2d-waifu/'
  var $root = $('.live2d-waifu-root')
  if (sessionStorage.getItem('waifu-display') === 'none') {
    $root.hide()
    mountRestoreFab(basePath)
    return
  }

  ensureWaifuBindings(basePath)
  window.setTimeout(waifuWelcomeBanner, 600)
}

window.startLive2dWaifu = startLive2dWaifu
