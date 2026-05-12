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
    showMessage('那我先躲起来啦，点右下角「看板娘」可以叫我回来~', 2800, true)
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

function removeRestoreFab() {
  $('#' + WAIFU_RESTORE_ID).remove()
}

function mountRestoreFab(basePath) {
  if (document.getElementById(WAIFU_RESTORE_ID)) return
  var $btn = $(
    '<button type="button" id="' +
      WAIFU_RESTORE_ID +
      '" class="live2d-waifu-restore" aria-label="显示看板娘">看板娘</button>',
  )
  $('body').append($btn)
  $btn.on('click', function () {
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
  })
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
