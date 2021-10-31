'use strict'
import { h, getH } from '@tpp/htm-x'

/*    way/
 * set up the canvas and the toolbar, then show the
 * first page
 */
export function init(id, pagefn) {
  const app = getH(id)

  const ctx = {
    app,
    pagefn
  }

  setupCanvas(ctx, err => {
    if(err) return console.error(err)

    setupToolbar(ctx, err => {
      if(err) return console.error(err)

      app.c(
        ctx.canvas.e,
        ctx.toolbar.e,
      )

      setupMouseHandler(ctx)

      ctx.zoom = 0
      ctx.showNdx = 0
      showPages(ctx)

    })
  })

}

/*    way/
 * set up a canvas element with some width
 * and height and use the first page to
 * calculate the display.
 */
function setupCanvas(ctx, cb) {
  const canvas = {
    e: h("canvas", { style: { display: 'block', margin: '0', padding: '0' } })
  }
  canvas.ctx = canvas.e.getContext('2d')
  canvas.box = {
    width: 800,
    height: 800,
  }
  canvas.e.width = canvas.box.width
  canvas.e.height = canvas.box.height

  ctx.canvas = canvas

  ctx.pagefn.get(1, (err, pg) => {
    if(err) return cb(err)
    calcInitialLayout(canvas.box, pg, layout => {
      ctx.layout = layout
      cb()
    })
  })
}

/*    way/
 * keep a 10% margin on the closest side and
 * enough space for two pages.
 */
function calcInitialLayout(box, pg, cb) {
  let height = box.height * 0.8
  let width = (pg.width * 2) * (height / pg.height)
  const maxwidth = box.width * 0.8
  if(width > maxwidth) {
    width = maxwidth
    height = (pg.height) * (width / (pg.width * 2))
  }
  const layout = {
    top: (box.height - height) / 2,
    left: (box.width - width) / 2,
    mid: box.width / 2,
    width: width,
    height,
  }
  cb(layout)
}

/*    way/
 * show the toolbar with next, previous, and zoom buttons
 */
function setupToolbar(ctx, cb) {
  const toolbar = h(".toolbar", {
    style: {
      'box-sizing': 'border-box',
      width: ctx.canvas.box.width + 'px',
      margin: '0',
      padding: '8px',
      background: "#333",
      color: '#eee',
      'font-size': '24px',
    }
  })

  const nxt = nxt_1()
  const prv = prv_1()
  enable_disable_1()

  const zoom = zoom_1()

  toolbar.c(
    prv, nxt, zoom
  )

  ctx.toolbar = {
    e: toolbar
  }

  cb()

  /*    way/
   * enable or disable the buttons
   * based on the current state
   */
  function enable_disable_1() {
    const enabled = {
      cursor: "pointer",
      "user-select": "none",
      "opacity": "1",
    }
    const disabled = {
      cursor: "not-allowed",
      "user-select": "none",
      opacity: "0.5",
    }
    if(!ctx.showNdx || ctx.pagefn.numPages() <= 1) {
      prv.attr({ style: disabled })
    } else {
      prv.attr({ style: enabled })
    }
    if((ctx.showNdx * 2 + 1) >= ctx.pagefn.numPages()) {
      nxt.attr({ style: disabled })
    } else {
      nxt.attr({ style: enabled })
    }
  }

  function nxt_1() {
    return h("span", {
      onclick: () => {
        if((ctx.showNdx * 2 + 1) >= ctx.pagefn.numPages()) return
        ctx.showNdx++
        enable_disable_1()
        showPages(ctx)
      }
    }, " > ")
  }

  function prv_1() {
    return h("span", {
      onclick: () => {
        if(!ctx.showNdx || ctx.pagefn.numPages() <= 1) return
        ctx.showNdx--
        enable_disable_1()
        showPages(ctx)
      }
    }, " < ")
  }

  /*    understand/
   * zoom smoothly, going up then re-setting back (pan AND zoom)
   * when too big
   */
  function zoom_1() {
    return h("span", {
      onclick: () => {
        let zoom = ctx.zoom + 1
        if(zoom > 4) {
          ctx.zoom = 0
          ctx.pan = null
          showPages(ctx)
        } else {
          animate({
            draw: curr => {
              ctx.zoom = curr.zoom
              showPages(ctx)
            },
            duration: 500,
            from: { zoom: ctx.zoom },
            to: { zoom },
            timing: t => t * t * (3.0 - 2.0 * t),
          })
        }
      },
      style : {
        "cursor": "pointer",
        "cursor": "zoom-in",
        "user-select": "none",
      }
    }, " + ")
  }
}

/*    way/
 * capture mouse events, passing them to the
 * actual handlers if set up
 */
function setupMouseHandler(ctx) {
  const handlers = [
    setupPanning(ctx),
  ]

  const events = [
    "onmouseenter", "onmouseleave",
    "onmousemove",
    "onclick",
    "onmousedown", "onmouseup",
  ]

  const attr = {}
  events.map(e => {
    attr[e] = evt => {
      handlers.map(h => {
        if(h[e]) h[e](evt)
      })
    }
  })

  ctx.app.attr(attr)
}

/*    way/
 * set up the ctx.pan offsets (only when zooming),
 * starting on the first mouse click and ending when
 * mouse up or we leave the box
 */
function setupPanning(ctx) {
  let start

  function onmouseleave(evt) {
    start = null
  }

  function onmousedown(evt) {
    if(!ctx.zoom) return
    start = mousePt(ctx, evt)
    if(ctx.pan) {
      start.x -= ctx.pan.x
      start.y -= ctx.pan.y
    }
  }

  function onmouseup(evt) {
    start = null
  }

  function onmousemove(evt) {
    const pt = mousePt(ctx, evt)
    if(start && inBox(ctx, pt)) {
      ctx.pan = {
        x: (pt.x - start.x),
        y: (pt.y - start.y),
      }
      showPages(ctx)
    } else {
      start = null
    }
  }

  return {
    onmouseleave,
    onmousedown,
    onmouseup,
    onmousemove,
  }

}

/*    way/
 * return true if the point is in the current box
 */
function inBox(ctx, pt) {
  const rt = currBox(ctx)
  return (rt.top <= pt.y && rt.bottom >= pt.y &&
          rt.left <= pt.x && rt.right >= pt.x)
}

/*    way/
 * return the location of the mouse relative to the app area
 */
function mousePt(ctx, evt) {
  const rect = ctx.app.getBoundingClientRect()
  return {
    x: evt.clientX - rect.x,
    y: evt.clientY - rect.y
  }
}

/*    way/
 * return the current rectangle
 */
function currBox(ctx) {
  const l = calcLayout(ctx)
  return {
    top: l.top,
    left: l.left,
    bottom: l.top + l.height,
    right: l.left + l.width,
  }
}

/*    understand/
 * return the layout, adjusted for zoom and panning
 */
function calcLayout(ctx) {
  let layout = ctx.layout

  if(ctx.zoom > 0) {
    layout = Object.assign({}, layout)
    if(ctx.zoom) {
      const zoom = ctx.zoom * 0.5
      layout.left = layout.left - layout.width * zoom / 2
      layout.top = layout.top - layout.height * zoom / 2
      layout.width = layout.width * (1 + zoom)
      layout.height = layout.height * (1 + zoom)
    }
    if(ctx.pan) {
      layout.left += ctx.pan.x
      layout.top += ctx.pan.y
      layout.mid += ctx.pan.x
    }
  }

  return layout
}

/*    way/
 * show the background, and the pages
 */
function showPages(ctx) {
  const canvas = ctx.canvas
  const left = ctx.showNdx * 2
  const right = left + 1
  canvas.ctx.save()
  show_bg_1()
  ctx.pagefn.get(left, (err, left) => {
    if(err) return console.error(err)
    ctx.pagefn.get(right, (err, right) => {
      if(err) return console.error(err)
      show_pgs_1(left, right, () => canvas.ctx.restore())
    })
  })

  /*    way/
   * get the current layout and, if no zoom, show the
   * surrounding box. Otherwise show the left and right
   * pages on the correct positions
   */
  function show_pgs_1(left, right, cb) {
    const layout = calcLayout(ctx)

    if(ctx.zoom == 0) show_bx_1(layout)

    const page_l = Object.assign({}, layout)
    const page_r = Object.assign({}, layout)
    page_l.width /= 2
    page_r.width /= 2
    page_r.left = layout.mid
    if(left) show_pg_1(left, page_l)
    if(right) show_pg_1(right, page_r)
    cb()
  }

  function show_pg_1(pg, loc) {
    canvas.ctx.drawImage(pg.img, loc.left, loc.top, loc.width, loc.height)
  }

  function show_bx_1(loc) {
    canvas.ctx.fillStyle = "#666"
    const border = 4
    canvas.ctx.fillRect(loc.left - border, loc.top-border, loc.width+border*2, loc.height+2*border)
  }

  function show_bg_1() {
    canvas.ctx.fillStyle = "#aaa"
    canvas.ctx.fillRect(0, 0, canvas.box.width, canvas.box.height)
  }
}

/*    understand/
 * animate the properties {from -> to} , calling ondone when ends
 */
function animate({ draw, duration, from, to, timing, ondone }) {
  if(!ondone) ondone = () => 1

  const start = Date.now()

  animate_1()

  function animate_1() {
    let frac = (Date.now() - start) / duration
    if(frac > 1) frac = 1
    const curr = progress_1(frac)
    draw(curr)
    if(frac === 1) ondone()
    else requestAnimationFrame(animate_1)
  }

  function progress_1(frac) {
    frac = timing(frac)
    const ret = Object.assign({}, from)
    for(let k in from) {
      const s = Number(from[k])
      const e = Number(to[k])
      ret[k] = s + (e - s) * frac
    }
    return ret
  }
}
