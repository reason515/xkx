# -*- coding: utf-8 -*-
"""Apply v6 UI changes to build_index.py and regenerate index.html."""
from pathlib import Path
import re

BUILD = Path(__file__).with_name("build_index.py")


def main():
    t = BUILD.read_text(encoding="utf-8")

    # --- CSS additions ---
    if ".exit-pad{" not in t:
        css_extra = r"""
.exit-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-width:280px;margin:0 auto 10px}
.exit-pad .cell{min-height:52px;border-radius:10px;border:1px solid var(--line);background:rgba(232,223,208,.04);color:var(--paper-dim);font-size:11px;line-height:1.25;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:6px 4px;font-family:inherit;cursor:default}
.exit-pad .cell.open{border-color:rgba(95,143,120,.45);background:rgba(95,143,120,.12);color:#d5ebe0;cursor:pointer}
.exit-pad .cell.open:active{background:rgba(95,143,120,.22)}
.exit-pad .cell .d{font-family:var(--font-display);font-size:12px;letter-spacing:.1em;color:var(--jade-bright)}
.exit-pad .cell.here{border-color:rgba(181,74,58,.4);background:rgba(181,74,58,.15);color:#f0d8d0}
.exit-pad .cell.here .d{color:#e8b4aa}
.exit-extra{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.exit-extra .chip.exit{min-width:72px}
.skill-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:11px 0;border-bottom:1px solid var(--line)}
.skill-row .meta{text-align:right}
.skill-row .meta .lv{display:block;font-size:12px;margin-bottom:2px}
.skill-row .meta .num{font-size:12px;color:var(--paper-dim);font-variant-numeric:tabular-nums}
.skill-row .barline{height:4px;border-radius:99px;background:rgba(0,0,0,.35);overflow:hidden;margin-top:6px}
.skill-row .barline i{display:block;height:100%;background:linear-gradient(90deg,var(--jade),var(--jade-bright));border-radius:99px}
.train-log{margin:12px 0 10px;padding:12px;border-radius:12px;border:1px solid rgba(95,143,120,.3);background:rgba(0,0,0,.22);min-height:96px;font-size:13px;line-height:1.75;color:rgba(232,223,208,.82)}
.train-log p{margin-bottom:6px}
.train-log p.new{color:var(--paper);animation:fadeIn .35s ease}
.train-log .sys{color:var(--jade-bright)}
.map-mode{display:flex;gap:6px;margin-bottom:10px}
.map-mode button{flex:1;height:34px;border-radius:8px;border:1px solid var(--line);background:transparent;color:var(--paper-dim);font-family:var(--font-display);letter-spacing:.12em;cursor:pointer}
.map-mode button.on{background:rgba(95,143,120,.2);border-color:rgba(95,143,120,.45);color:var(--paper)}
.map-view{display:none}.map-view.on{display:block}
.world-map{position:relative;min-height:340px;border-radius:12px;border:1px solid var(--line-strong);background:
 radial-gradient(ellipse 50% 40% at 70% 30%,rgba(106,143,158,.12),transparent 60%),
 radial-gradient(ellipse 40% 35% at 25% 55%,rgba(95,143,120,.1),transparent 55%),
 rgba(0,0,0,.25);padding:12px;overflow:auto}
.world-map .spot{position:absolute;transform:translate(-50%,-50%);padding:5px 8px;border-radius:8px;border:1px solid rgba(232,223,208,.18);background:rgba(26,23,20,.85);font-size:10px;line-height:1.2;color:var(--paper-dim);text-align:center;cursor:pointer;white-space:nowrap}
.world-map .spot.city{border-color:rgba(95,143,120,.4);color:#d5ebe0}
.world-map .spot.sect{border-color:rgba(106,143,158,.4);color:#c5d7e0}
.world-map .spot.wild{border-color:rgba(196,163,90,.35);color:#e0d0a8}
.world-map .spot.here{border-color:rgba(181,74,58,.55);background:rgba(181,74,58,.35);color:#f5e6e0;z-index:2}
.world-map .spot:active{filter:brightness(1.15)}
.world-legend{margin-top:10px;font-size:11px;color:var(--paper-dim);line-height:1.5}
"""
        t = t.replace("@media (max-width:480px)", css_extra + "@media (max-width:480px)", 1)

    # bump version strings
    t = t.replace("\\u6982\\u5ff5\\u7a3f v5", "\\u6982\\u5ff5\\u7a3f v6")
    t = t.replace("\\u79fb\\u52a8\\u7aef\\u754c\\u9762\\u6982\\u5ff5 v5", "\\u79fb\\u52a8\\u7aef\\u754c\\u9762\\u6982\\u5ff5 v6")
    t = t.replace("\u6982\u5ff5\u7a3f v5", "\u6982\u5ff5\u7a3f v6")
    t = t.replace("\u79fb\u52a8\u7aef\u754c\u9762\u6982\u5ff5 v5", "\u79fb\u52a8\u7aef\u754c\u9762\u6982\u5ff5 v6")

    # Replace context_block
    t = replace_func(t, "context_block", CONTEXT)
    t = replace_func(t, "skill", SKILL)
    t = replace_func(t, "map_overlay", MAP)
    t = replace_func(t, "train_overlay", TRAIN)
    t = replace_func(t, "script_block", SCRIPT)

    BUILD.write_text(t, encoding="utf-8", newline="\n")
    print("patched", BUILD)

    import importlib.util
    spec = importlib.util.spec_from_file_location("build_index", BUILD)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.main()


def replace_func(text: str, name: str, body: str) -> str:
    """Replace def name(...): ... until next top-level def."""
    pattern = rf"(?m)^def {name}\(.*?(?=^def |\Z)"
    new_text, n = re.subn(pattern, lambda _m: body.rstrip() + "\n\n\n", text, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f"replace {name} failed n={n}")
    return new_text


CONTEXT = r'''def context_block():
    # compass grid: NW N NE / W here E / SW S SE + vertical extras
    def cell(key, dlabel, name, desc, cls=""):
        if key == "here":
            return f'<div class="cell here"><span class="d">{dlabel}</span>{name}</div>'
        if not name:
            return f'<div class="cell"><span class="d">{dlabel}</span></div>'
        return (
            f'<button type="button" class="cell open {cls}" data-exit="{key}" data-name="{name}" data-desc="{desc}">'
            f'<span class="d">{dlabel}</span>{name}</button>'
        )

    pad = (
        '<div class="exit-pad" id="exitPad">'
        + cell("northwest", "\u897f\u5317", "", "")
        + cell("north", "\u5317", "\u9a6c\u53a2", "\u5317\u8fb9\u8fde\u7740\u5ba2\u5e97\u7684\u9a6c\u53a2\uff0c\u9690\u9690\u6709\u9a6c\u9a74\u58f0\u3002")
        + cell("northeast", "\u4e1c\u5317", "", "")
        + cell("west", "\u897f", "\u82b1\u5e97", "\u897f\u8fb9\u662f\u4e00\u5bb6\u82b1\u5e97\uff0c\u95e8\u524d\u6446\u7740\u51e0\u76c6\u65f6\u4ee4\u9c9c\u82b1\u3002")
        + cell("here", "\u6b64", "\u5ba2\u5e97", "")
        + cell("east", "\u4e1c", "\u5317\u5927\u8857", "\u4e1c\u8fb9\u662f\u70ed\u95f9\u7684\u5317\u5927\u8857\uff0c\u884c\u4eba\u6765\u6765\u5f80\u5f80\u3002")
        + cell("southwest", "\u897f\u5357", "", "")
        + cell("south", "\u5357", "\u9a7f\u7ad9", "\u5357\u8fb9\u662f\u626c\u5dde\u9a7f\u7ad9\uff0c\u4fe1\u4f7f\u4e0e\u811a\u592b\u8fdb\u8fdb\u51fa\u51fa\u3002")
        + cell("southeast", "\u4e1c\u5357", "\u674e\u5b85", "\u4e1c\u5357\u65b9\u5411\u6709\u4e00\u5ea7\u674e\u5b85\uff08\u793a\u610f\uff09\u3002")
        + "</div>"
    )
    extra = (
        '<div class="exit-extra">'
        '<button type="button" class="chip exit" data-exit="up" data-name="\u96c5\u623f" data-desc="\u697c\u4e0a\u662f\u96c5\u623f\uff0c\u6bcf\u591c\u4e94\u4e24\u767d\u94f6\u3002">'
        '<span class="dir">\u4e0a</span>\u96c5\u623f</button>'
        '</div>'
    )
    return f"""
<section class="context" id="context">
<div class="ctx-block" id="exitBlock">
<h2>\u51fa\u53e3</h2>
{pad}
{extra}
</div>
<div class="ctx-block" id="objBlock"><h2>\u4eba\u7269 \u00b7 \u7269\u54c1</h2><div class="chips">
<button type="button" class="chip npc" data-kind="npc" data-name="\u5e97\u5c0f\u4e8c" data-desc="\u4e00\u4e2a\u8dd1\u5802\u7684\u5e97\u5c0f\u4e8c\uff0c\u624b\u811a\u5229\u843d\uff0c\u6b63\u5fd9\u7740\u62db\u547c\u5ba2\u4eba\u3002">\u5e97\u5c0f\u4e8c</button>
<button type="button" class="chip item" data-kind="item" data-name="\u724c\u5b50" data-desc="\u6728\u724c\u4e0a\u5199\u7740\uff1a\u697c\u4e0a\u96c5\u623f\uff0c\u6bcf\u591c\u4e94\u4e24\u767d\u94f6\u3002">\u724c\u5b50</button>
</div></div>
</section>
"""


'''

SKILL = r'''def skill(cls, name, m, lv, level, learned, enabled):
    need = (level + 1) * (level + 1)
    pct = min(100, int(learned * 100 / need)) if need else 0
    eq = '<span class="eq">\u25a1</span>' if enabled else ''
    return (
        f'<div class="skill-row {cls}"><div class="skill-main">'
        f'<div class="name">{eq}<span class="skname">{name}</span></div>'
        f'<div class="barline"><i style="width:{pct}%"></i></div></div>'
        f'<div class="meta"><span class="lv {m}">{lv}</span><span class="num">Lv{level}</span></div></div>'
    )


'''

MAP = r'''def map_overlay():
    spots = [
        # x%, y%, name, kind, here?
        (72, 12, "\u957f\u767d\u5c71", "wild", False),
        (78, 18, "\u8d6b\u56fe\u963f\u62c9", "city", False),
        (70, 28, "\u4eac\u5e08", "city", False),
        (88, 30, "\u795e\u9f99\u5c9b", "sect", False),
        (58, 32, "\u5c11\u6797", "sect", False),
        (52, 40, "\u5d69\u5c71", "wild", False),
        (22, 22, "\u661f\u5bbf", "sect", False),
        (30, 28, "\u4f0a\u7281", "city", False),
        (40, 30, "\u7075\u5dde", "city", False),
        (18, 42, "\u767d\u9a86", "sect", False),
        (14, 50, "\u660e\u6559", "sect", False),
        (12, 58, "\u6606\u4ed1", "wild", False),
        (28, 48, "\u7941\u8fde", "wild", False),
        (36, 52, "\u534e\u5c71", "sect", False),
        (34, 58, "\u5170\u5dde", "city", False),
        (48, 58, "\u626c\u5dde", "city", True),
        (62, 52, "\u6cf0\u5c71", "wild", False),
        (58, 68, "\u5609\u5174", "city", False),
        (64, 74, "\u676d\u5dde", "city", False),
        (82, 70, "\u6843\u82b1\u5c9b", "sect", False),
        (42, 72, "\u6b66\u5f53", "sect", False),
        (28, 78, "\u5ce8\u5d89", "sect", False),
        (22, 72, "\u5927\u96ea\u5c71", "sect", False),
        (24, 86, "\u5927\u7406", "city", False),
        (38, 88, "\u4f5b\u5c71", "city", False),
        (58, 86, "\u6cc9\u5dde", "city", False),
        (78, 90, "\u4fa0\u5ba2\u5c9b", "sect", False),
    ]
    world = ['<div class="world-map" id="worldMap">']
    for x, y, name, kind, here in spots:
        cls = f"spot {kind}" + (" here" if here else "")
        world.append(f'<button type="button" class="{cls}" style="left:{x}%;top:{y}%">{name}</button>')
    world.append("</div>")
    world_html = "".join(world)

    return f"""
<div class="overlay center" id="mapOverlay"><div class="map-card">
<header><h3 id="mapTitle">\u626c\u5dde \u00b7 \u5ba2\u5e97\u4e00\u5e26</h3><button type="button" class="close" data-close>&times;</button></header>
<div class="map-mode" id="mapMode">
<button type="button" class="on" data-mode="local">\u533a\u57df</button>
<button type="button" data-mode="world">\u4e16\u754c</button>
</div>
<div class="map-scroll">
<div class="map-view on" id="mapLocal">
<div class="floors" id="floorTabs">
<button type="button" class="on" data-floor="1">\u4e00\u697c</button>
<button type="button" data-floor="2">\u4e8c\u697c</button>
</div>
<p class="map-legend">\u25ce \u5f53\u524d\u4f4d\u7f6e\u3000\u2191\u2193 \u53ef\u4e0a\u4e0b\u697c</p>
<div class="floor-pane on" id="floor-1"><div class="city-map">
<div class="cell"></div><div class="cell road">\u5317\u95e8</div><div class="cell road">\u5317\u8857</div><div class="cell landmark">\u94b1\u5e84</div><div class="cell"></div>
<div class="cell road">\u897f\u95e8</div><div class="cell road">\u897f\u8857</div><div class="cell road">\u4e2d\u592e</div><div class="cell road">\u4e1c\u8857</div><div class="cell road">\u4e1c\u95e8</div>
<div class="cell landmark">\u6b66\u5e99</div><div class="cell road">\u82b1\u5e97</div><div class="cell here">\u5ba2\u5e97<span class="vert-tag">\u2191 \u96c5\u623f</span></div><div class="cell landmark">\u5f53\u94fa</div><div class="cell"></div>
<div class="cell"></div><div class="cell road">\u5357\u95e8</div><div class="cell road">\u9a7f\u7ad9</div><div class="cell landmark">\u4e66\u9662</div><div class="cell"></div>
<div class="cell"></div><div class="cell"></div><div class="cell landmark">\u6e21\u53e3</div><div class="cell"></div><div class="cell"></div>
</div></div>
<div class="floor-pane" id="floor-2"><div class="city-map">
<div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div>
<div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div>
<div class="cell"></div><div class="cell road">\u7ae2\u623f</div><div class="cell here">\u96c5\u623f<span class="vert-tag">\u2193 \u5ba2\u5e97</span></div><div class="cell road">\u8d70\u5eca</div><div class="cell"></div>
<div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div>
<div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div>
</div></div>
</div>
<div class="map-view" id="mapWorld">
<p class="map-legend">\u4f9d\u636e\u300c\u4fa0\u5ba2\u884c\u7b2c\u4e00\u9636\u6bb5\u603b\u56fe\u300d\u6392\u5e03\uff1b\u70b9\u9009\u5730\u6807\u53ef\u67e5\u770b</p>
{world_html}
<p class="world-legend">\u7ea2\u8272\u4e3a\u5f53\u524d\u6240\u5728\uff08\u626c\u5dde\uff09\u3002\u7eff\uff1a\u57ce\u5e02\u3000\u9752\uff1a\u95e8\u6d3e\u3000\u9ec4\uff1a\u5c71\u5ddd\u5730\u5e26</p>
</div>
</div>
</div></div>
"""


'''

TRAIN = r'''def train_overlay():
    return """
<div class="overlay" id="trainOverlay"><div class="sheet">
<div class="sheet-top"><div><h3>\u4fee\u70bc</h3><div class="sub">\u9009\u62e9\u4fee\u70bc\u65b9\u5f0f</div></div>
<button type="button" class="close" data-close>&times;</button></div>
<div class="sheet-scroll">
<div class="train-opts" id="trainOpts">
<button type="button" class="train-opt" data-train="dazuo"><strong>\u6253\u5750</strong><span>\u8fd0\u529f\u8c03\u606f\uff0c\u7f13\u6162\u6062\u590d\u5185\u529b\u4e0e\u6c14\u8840\u3002</span></button>
<button type="button" class="train-opt" data-train="tuna"><strong>\u5410\u7eb3</strong><span>\u547c\u5438\u5410\u7eb3\uff0c\u6062\u590d\u7cbe\u529b\u3002</span></button>
<button type="button" class="train-opt" data-train="lian"><strong>\u7ec3\u529f</strong><span>\u7ec3\u4e60\u5df2\u88c5\u5907\u7684\u6b66\u529f\uff0c\u6d88\u8017\u6f5c\u80fd\u3002</span></button>
</div>
<div class="progress-box" id="trainProgress">
<div class="t" id="trainProgressText">\u6253\u5750\u4e2d\u2026</div>
<div class="train-log" id="trainLog"></div>
<div class="progress-track"><i></i></div>
</div>
</div>
<div class="sheet-acts"><button type="button" data-close>\u5173\u95ed</button><button type="button" class="danger" id="btnHalt" disabled>\u505c\u6b62</button></div>
</div></div>
"""


'''

SCRIPT = r'''def script_block():
    return r"""
<script>
const dirLabel={east:"\u4e1c",west:"\u897f",north:"\u5317",south:"\u5357",up:"\u4e0a",down:"\u4e0b",northeast:"\u4e1c\u5317",northwest:"\u897f\u5317",southeast:"\u4e1c\u5357",southwest:"\u897f\u5357"};
const trainLines={
 dazuo:[
  "\u4f60\u5750\u4e0b\u6765\u8fd0\u6c14\u7528\u529f\uff0c\u4e00\u80a1\u5185\u606f\u5f00\u59cb\u5728\u4f53\u5185\u6d41\u52a8\u3002",
  "\u4f60\u76d8\u819d\u800c\u5750\uff0c\u5f00\u59cb\u4fee\u70bc\u5185\u529b\u3002",
  "\u5185\u606f\u6cbf\u7740\u7ecf\u8109\u7f13\u7f13\u6d41\u8f6c\uff0c\u5468\u8eab\u6e29\u6696\u3002",
  "\u4f60\u53ea\u89c9\u4e00\u80a1\u70ed\u6d41\u5728\u4e39\u7530\u4e0e\u767e\u4f1a\u4e4b\u95f4\u5f80\u8fd4\u3002",
  "\u4f60\u8fd0\u529f\u5b8c\u6bd5\uff0c\u6df1\u6df1\u5438\u4e86\u53e3\u6c14\u3002"
 ],
 tuna:[
  "\u4f60\u95ed\u4e0a\u773c\u775b\u5f00\u59cb\u6253\u5750\uff0c\u5168\u8eab\u6696\u6d0b\u6d0b\u5730\u751a\u662f\u8212\u670d\u3002",
  "\u4f60\u76d8\u819d\u800c\u5750\uff0c\u5f00\u59cb\u5410\u7eb3\u70bc\u7cbe\u3002",
  "\u4f60\u8c03\u5300\u547c\u5438\uff0c\u7cbe\u795e\u9010\u6e10\u805a\u96c6\u3002",
  "\u4e00\u4e1d\u6e05\u6c14\u81ea\u767e\u4f1a\u5347\u8d77\uff0c\u6f5c\u5165\u6ce5\u4e38\u3002",
  "\u4f60\u5410\u7eb3\u5b8c\u6bd5\uff0c\u611f\u5230\u7cbe\u795e\u4e3a\u4e4b\u4e00\u632f\u3002"
 ],
 lian:[
  "\u4f60\u5f00\u59cb\u7ec3\u4e60\u72ec\u5b64\u4e5d\u5251\u3002",
  "\u4f60\u7ec3\u4e60\u7740\u72ec\u5b64\u4e5d\u5251\u4e2d\u7684\u300c\u603b\u8bc0\u5f0f\u300d\u8fd9\u4e00\u62db\uff0c\u770b\u6765\u6709\u4e9b\u8fdb\u6b65\u3002",
  "\u5251\u5149\u70b9\u70b9\uff0c\u4f60\u53c8\u91cd\u590d\u7ec3\u4e60\u4e86\u51e0\u904d\u3002",
  "\u4f60\u7ec3\u4e60\u7740\u72ec\u5b64\u4e5d\u5251\uff0c\u770b\u6765\u6709\u4e9b\u8fdb\u6b65\u3002"
 ]
};

let pendingExit=null, trainTimer=null, trainIdx=0, trainKind=null;
function openOverlay(id){document.getElementById(id).classList.add("open")}
function closeOverlays(){document.querySelectorAll(".overlay.open").forEach(el=>el.classList.remove("open"))}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove("show"),1400)}
function pushLog(html){const p=document.createElement("p");p.className="new";p.innerHTML=html;document.getElementById("logList").prepend(p)}
function pushTrain(html, cls){const p=document.createElement("p");if(cls)p.className=cls;p.innerHTML=html;const box=document.getElementById("trainLog");box.appendChild(p);box.scrollTop=box.scrollHeight}

document.getElementById("openHero").onclick=()=>openOverlay("heroOverlay");
document.getElementById("openMap").onclick=()=>openOverlay("mapOverlay");
document.querySelectorAll("[data-close]").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();closeOverlays()}));
document.querySelectorAll(".overlay").forEach(ov=>ov.addEventListener("click",e=>{if(e.target===ov)closeOverlays()}));

function openExit(btn){const dir=btn.dataset.exit;pendingExit={dir,name:btn.dataset.name};document.getElementById("exitTitle").textContent=`${dirLabel[dir]||dir} \u00b7 ${btn.dataset.name}`;document.getElementById("exitDesc").textContent=btn.dataset.desc;openOverlay("exitOverlay")}
document.querySelectorAll(".chip.exit, .exit-pad .cell.open").forEach(btn=>btn.addEventListener("click",()=>openExit(btn)));
document.getElementById("btnGo").onclick=()=>{closeOverlays();if(!pendingExit)return;toast(`\u524d\u5f80${pendingExit.name}`);pushLog(`\u4f60\u5f80<span class="hl">${dirLabel[pendingExit.dir]||pendingExit.dir}</span>\u79bb\u53bb\uff0c\u6765\u5230${pendingExit.name}\u3002`)};

document.querySelectorAll(".chip.npc,.chip.item").forEach(btn=>btn.addEventListener("click",()=>{
 const kind=btn.dataset.kind;document.getElementById("objTitle").textContent=btn.dataset.name;
 document.getElementById("objSub").textContent=kind==="npc"?"\u4eba\u7269":"\u7269\u54c1";
 document.getElementById("objDesc").textContent=btn.dataset.desc;
 const acts=document.getElementById("objActs");
 acts.innerHTML=kind==="npc"
  ?`<button type="button" data-close>\u770b</button><button type="button" data-close>\u95ee</button><button type="button" data-close>\u7ed9</button><button type="button" class="danger" id="objFight">\u6253</button>`
  :`<button type="button" data-close>\u770b</button><button type="button" data-close>\u62ff</button><button type="button" data-close>\u7528</button><button type="button" data-close>\u4e22</button>`;
 acts.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",closeOverlays));
 const fight=document.getElementById("objFight");if(fight)fight.onclick=()=>{closeOverlays();openOverlay("combatOverlay")};
 openOverlay("objOverlay");
}));

document.querySelectorAll("#heroTabs button").forEach(tab=>tab.addEventListener("click",()=>{
 document.querySelectorAll("#heroTabs button").forEach(t=>t.classList.remove("on"));tab.classList.add("on");
 document.querySelectorAll("#heroOverlay .panel").forEach(p=>p.classList.remove("on"));
 document.getElementById(`panel-${tab.dataset.tab}`).classList.add("on");
}));
document.querySelectorAll("#floorTabs button").forEach(tab=>tab.addEventListener("click",()=>{
 document.querySelectorAll("#floorTabs button").forEach(t=>t.classList.remove("on"));tab.classList.add("on");
 document.querySelectorAll(".floor-pane").forEach(p=>p.classList.remove("on"));
 document.getElementById(`floor-${tab.dataset.floor}`).classList.add("on");
}));
document.querySelectorAll("#mapMode button").forEach(tab=>tab.addEventListener("click",()=>{
 document.querySelectorAll("#mapMode button").forEach(t=>t.classList.remove("on"));tab.classList.add("on");
 document.getElementById("mapLocal").classList.toggle("on", tab.dataset.mode==="local");
 document.getElementById("mapWorld").classList.toggle("on", tab.dataset.mode==="world");
 document.getElementById("mapTitle").textContent=tab.dataset.mode==="world"?"\u4e16\u754c\u5730\u56fe":"\u626c\u5dde \u00b7 \u5ba2\u5e97\u4e00\u5e26";
}));
document.querySelectorAll("#worldMap .spot").forEach(sp=>sp.addEventListener("click",()=>{
 toast(sp.classList.contains("here")?`\u4f60\u73b0\u5728\uff1a${sp.textContent}`:`${sp.textContent}`);
}));

document.getElementById("btnLook").onclick=()=>{
 const desc=document.getElementById("roomDesc");desc.classList.remove("flash");void desc.offsetWidth;desc.classList.add("flash");
 document.getElementById("exitBlock").classList.remove("highlight");document.getElementById("objBlock").classList.remove("highlight");
 void document.getElementById("exitBlock").offsetWidth;document.getElementById("exitBlock").classList.add("highlight");document.getElementById("objBlock").classList.add("highlight");
 pushLog("\u4f60\u4ed4\u7ec6\u73af\u987e\u56db\u5468\uff0c\u91cd\u65b0\u6253\u91cf\u6b64\u5730\u7684\u51fa\u53e3\u4e0e\u4eba\u7269\u3002");toast("\u73af\u987e\u56db\u5468");document.getElementById("mainScroll").scrollTo({top:0,behavior:"smooth"});
};

document.getElementById("btnTrain").onclick=()=>openOverlay("trainOverlay");

function stopTrain(silent){
 if(trainTimer){clearInterval(trainTimer);trainTimer=null}
 trainKind=null;trainIdx=0;
 document.getElementById("trainProgress").classList.remove("on");
 document.querySelectorAll(".train-opt").forEach(o=>o.classList.remove("on"));
 document.getElementById("btnHalt").disabled=true;
 document.getElementById("btnTrain").classList.remove("busy");
 document.getElementById("btnTrain").textContent="\u4fee\u70bc";
 if(!silent){pushLog("\u4f60\u7ad9\u8d77\u8eab\u6765\uff0c\u505c\u6b62\u4e86\u4fee\u70bc\u3002");toast("\u5df2\u505c\u6b62")}
}

document.querySelectorAll(".train-opt").forEach(opt=>opt.addEventListener("click",()=>{
 document.querySelectorAll(".train-opt").forEach(o=>o.classList.remove("on"));opt.classList.add("on");
 const names={dazuo:"\u6253\u5750",tuna:"\u5410\u7eb3",lian:"\u7ec3\u529f"};
 trainKind=opt.dataset.train;const name=names[trainKind];
 document.getElementById("trainProgress").classList.add("on");
 document.getElementById("trainProgressText").textContent=`${name}\u4e2d`;
 document.getElementById("trainLog").innerHTML="";
 document.getElementById("btnHalt").disabled=false;
 document.getElementById("btnTrain").classList.add("busy");
 document.getElementById("btnTrain").textContent=name+"\u4e2d";
 pushLog(`\u4f60\u76d8\u819d\u800c\u5750\uff0c\u5f00\u59cb<span class="hl">${name}</span>\u3002`);
 toast(`${name}\u5f00\u59cb`);
 trainIdx=0;
 const lines=trainLines[trainKind];
 pushTrain(lines[0],"sys new");
 if(trainTimer)clearInterval(trainTimer);
 trainTimer=setInterval(()=>{
  trainIdx++;
  if(trainIdx>=lines.length-1){
   pushTrain(lines[lines.length-1],"sys new");
   clearInterval(trainTimer);trainTimer=null;
   document.getElementById("trainProgressText").textContent=`${name}\u5b8c\u6bd5`;
   document.getElementById("btnTrain").classList.remove("busy");
   document.getElementById("btnTrain").textContent="\u4fee\u70bc";
   document.getElementById("btnHalt").disabled=true;
   pushLog(`\u4f60${name}\u5b8c\u6bd5\uff0c\u7ad9\u8d77\u8eab\u6765\u3002`);
   return;
  }
  pushTrain(lines[trainIdx],"new");
 },1600);
}));

document.getElementById("btnHalt").onclick=()=>{stopTrain(false);closeOverlays()};
document.getElementById("btnFight").onclick=()=>openOverlay("fightPickOverlay");
document.getElementById("pickXiaoer").onclick=()=>{closeOverlays();openOverlay("combatOverlay");pushLog("\u4f60\u5bf9\u5e97\u5c0f\u4e8c\u559d\u9053\uff1a<span class=\"hl\">\u300c\u770b\u62db\uff01\u300d</span>")};
document.getElementById("btnPerform").onclick=()=>{const p=document.createElement("p");p.className="hit";p.textContent="\u4f60\u4f7f\u51fa\u300c\u82cd\u677e\u8fce\u5ba2\u300d\uff0c\u5251\u5149\u5982\u7535\uff01";document.getElementById("combatLog").prepend(p);toast("\u4f7f\u51fa\u7edd\u62db")};
</script>
"""


'''


if __name__ == "__main__":
    main()
