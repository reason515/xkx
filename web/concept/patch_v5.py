# -*- coding: utf-8 -*-
"""Patch build_index.py for v5 concept changes, then regenerate HTML."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
BUILD = ROOT / "build_index.py"


def main():
    text = BUILD.read_text(encoding="utf-8")

    # Remove compass from body
    text2, n = re.subn(
        r"\{compass_block\(\)\}\n<p class=\"compass-hint\">\{t\['hint'\]\}</p>\n",
        "",
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit(f"compass remove failed n={n}")
    text = text2

    # Add exit-hint css if missing
    if ".exit-hint{" not in text:
        text = text.replace(
            ".ctx-block h2{",
            ".exit-hint{font-size:11px;color:var(--paper-dim);margin:-2px 0 8px;line-height:1.5}"
            ".ctx-block h2{",
            1,
        )

    # Replace hero_overlay function entirely
    start = text.find("def hero_overlay():")
    end = text.find("\ndef meter(")
    if start < 0 or end < 0:
        raise SystemExit("hero_overlay bounds not found")
    text = text[:start] + HERO_OVERLAY + text[end:]

    # Replace skill() helper
    start = text.find("def skill(")
    end = text.find("\ndef bag(")
    if start < 0 or end < 0:
        raise SystemExit("skill bounds not found")
    text = text[:start] + SKILL_FN + text[end:]

    # Wrap overlay sheets with sheet-scroll: patch overlays() exit/obj and map/train/fight
    text = patch_simple_sheets(text)

    # Fix script: remove compassHere handler dependency
    text = text.replace(
        'document.getElementById("compassHere").onclick=()=>{toast("\\u4f60\\u6b63\\u5728\\u8fd9\\u91cc");openOverlay("mapOverlay")};',
        "",
        1,
    )
    text = text.replace(
        'document.querySelectorAll(".chip.exit,.compass-item[data-exit]")',
        'document.querySelectorAll(".chip.exit")',
        1,
    )

    # Update note text version
    text = text.replace(
        "\\u6982\\u5ff5\\u7a3f v4",
        "\\u6982\\u5ff5\\u7a3f v5",
        1,
    )
    text = text.replace(
        "v4</title>",
        "v5</title>",
    )
    text = text.replace(
        "\\u79fb\\u52a8\\u7aef\\u754c\\u9762\\u6982\\u5ff5 v4",
        "\\u79fb\\u52a8\\u7aef\\u754c\\u9762\\u6982\\u5ff5 v5",
        1,
    )

    # Enhance context_block exit header with hint
    old = '<div class="ctx-block" id="exitBlock"><h2>\\u51fa\\u53e3</h2><div class="chips">'
    # In file the escapes are real unicode already from previous writes - check
    if old not in text:
        old2 = '<div class="ctx-block" id="exitBlock"><h2>\u51fa\u53e3</h2><div class="chips">'
        if old2 in text:
            text = text.replace(
                old2,
                '<div class="ctx-block" id="exitBlock"><h2>\u51fa\u53e3</h2>'
                '<p class="exit-hint">\u70b9\u9009\u65b9\u5411\u53ef\u9884\u89c8\u5e76\u524d\u5f80\uff1b\u533a\u57df\u603b\u89c8\u89c1\u53f3\u4e0a\u89d2\u300c\u5730\u56fe\u300d</p>'
                '<div class="chips">',
                1,
            )
        else:
            print("WARN: exit hint not inserted")
    else:
        text = text.replace(
            old,
            '<div class="ctx-block" id="exitBlock"><h2>\\u51fa\\u53e3</h2>'
            '<p class="exit-hint">\\u70b9\\u9009\\u65b9\\u5411\\u53ef\\u9884\\u89c8\\u5e76\\u524d\\u5f80\\uff1b\\u533a\\u57df\\u603b\\u89c8\\u89c1\\u53f3\\u4e0a\\u89d2\\u300c\\u5730\\u56fe\\u300d</p>'
            '<div class="chips">',
            1,
        )

    BUILD.write_text(text, encoding="utf-8", newline="\n")
    print("patched build_index.py")

    # regenerate
    import build_index as bi
    bi.main()


HERO_OVERLAY = r'''def hero_overlay():
    return f"""
<div class="overlay" id="heroOverlay"><div class="sheet">
<div class="sheet-top"><div><h3>\u9752\u4e91</h3><div class="sub">\u666e\u901a\u767e\u59d3 \u00b7 \u626c\u5dde</div></div>
<button type="button" class="close" data-close>&times;</button></div>
<div class="tabs" id="heroTabs">
<button type="button" class="on" data-tab="look">\u4eea\u5bb9</button>
<button type="button" data-tab="hp">\u6c14\u8840</button>
<button type="button" data-tab="score">\u6863\u6848</button>
<button type="button" data-tab="skills">\u6b66\u529f</button>
<button type="button" data-tab="bag">\u884c\u56ca</button>
</div>
<div class="sheet-scroll">

<div class="panel on" id="panel-look"><div class="look-block">
<p>\u4f60\u770b\u8d77\u6765\u7ea6\u4e8c\u5341\u591a\u5c81\u3002</p>
<p>\u4f60\u770b\u8d77\u6765\u6c14\u8840\u5145\u76c8\uff0c\u5e76\u6ca1\u6709\u53d7\u4f24\u3002</p>
<div class="wear"><p>\u4f60\u8eab\u4e0a\u5e26\u7740\uff1a</p><ul>
<li><span class="eq">\u25a1</span><span class="t-armor">\u666e\u901a\u5e03\u8863</span></li>
<li><span class="eq">\u25a1</span><span class="t-weapon">\u957f\u5251</span></li>
<li><span class="t-food">\u725b\u76ae\u9152\u888b</span></li>
</ul></div></div></div>

<div class="panel" id="panel-hp"><div class="meter-list">
{meter('jing','\u7cbe','460 / 500','92%')}
{meter('jingli','\u7cbe\u529b','180 / 200','90%')}
{meter('qi','\u6c14','390 / 500','78%')}
{meter('neili','\u5185\u529b','220 / 400 <small>\u52a0\u529b +20</small>','55%')}
{meter('food','\u98df\u7269','120 / 200','60%')}
{meter('water','\u996e\u6c34','90 / 200','45%')}
</div>
<div class="scalar-grid">
<div class="scalar exp"><span>\u7ecf\u9a8c</span><span class="v">12480</span></div>
<div class="scalar pot"><span>\u6f5c\u80fd</span><span class="v">860</span></div>
</div>
</div>

<div class="panel" id="panel-score">
<div class="profile-line">\u4f60\u662f\u4e00\u4e2a<strong>\u4e8c\u5341\u5c81</strong>\u4e24\u4e2a\u6708\u7684<strong>\u7537\u6027</strong>\u4eba\u7c7b\u3002<br/>\u95e8\u6d3e\uff1a\u65e0\u3000\u5e08\u7236\uff1a\u2014</div>
<div class="combat-grid">
<div class="combat-pill atk"><div class="k">\u653b\u51fb</div><div class="v">186</div></div>
<div class="combat-pill def"><div class="k">\u9632\u5fa1</div><div class="v">142</div></div>
</div>
<div class="attr-list">
<div class="attr-row head"><span class="name"></span><span class="nums"><span class="cur">\u5f53\u524d</span><span class="sep">/</span><span class="base">\u5148\u5929</span></span></div>
{attr('str','\u81c2\u529b',18,16)}
{attr('int','\u609f\u6027',22,20)}
{attr('con','\u6839\u9aa8',17,15)}
{attr('dex','\u8eab\u6cd5',19,17)}
</div>
<div class="scalar-grid">
<div class="scalar shen"><span>\u795e</span><span class="v">120</span></div>
<div class="scalar"><span>\u9605\u5386</span><span class="v">35</span></div>
<div class="scalar"><span>\u6740\u654c</span><span class="v">12</span></div>
<div class="scalar"><span>\u6b7b\u4ea1</span><span class="v">1</span></div>
</div>
<p class="attr-legend">\u5f53\u524d\u542b\u88c5\u5907\u4e0e\u4e34\u65f6\u52a0\u6210\uff1b\u653b\u51fb/\u9632\u5fa1\u7531\u6b66\u529f\u4e0e\u88c5\u5907\u63a8\u7b97\u3002</p>
</div>

<div class="panel" id="panel-skills">
<div class="enabled-box">
<h4>\u5df2\u88c5\u5907</h4>
<div class="enabled-row force"><span class="slot">\u5185\u529f</span><span class="sk">\u5317\u51a5\u795e\u529f</span><span class="eff">\u6709\u6548 180</span></div>
<div class="enabled-row weapon"><span class="slot">\u5251\u6cd5</span><span class="sk">\u72ec\u5b64\u4e5d\u5251</span><span class="eff">\u6709\u6548 120</span></div>
<div class="enabled-row dodge"><span class="slot">\u8f7b\u529f</span><span class="sk">\u57fa\u672c\u8f7b\u529f</span><span class="eff">\u6709\u6548 45</span></div>
<div class="enabled-row parry"><span class="slot">\u62db\u67b6</span><span class="sk">\u72ec\u5b64\u4e5d\u5251</span><span class="eff">\u6709\u6548 120</span></div>
</div>
{skill('dodge','\u57fa\u672c\u8f7b\u529f','m2','\u9a6c\u9a6c\u864e\u864e',45,1200,True)}
{skill('weapon','\u57fa\u672c\u5251\u6cd5','m1','\u521d\u5b66\u4e4d\u7ec3',20,180,False)}
{skill('force','\u57fa\u672c\u5185\u529f','m2','\u7c97\u901a\u76ae\u6bdb',30,400,False)}
{skill('knowledge','\u8bfb\u4e66\u5199\u5b57','m2','\u7565\u77e5\u4e00\u4e8c',12,80,False)}
{skill('weapon','\u72ec\u5b64\u4e5d\u5251','m4','\u51fa\u7c7b\u62d4\u8403',120,5600,True)}
{skill('force','\u5317\u51a5\u795e\u529f','m5','\u767b\u5cf0\u9020\u6781',180,12000,True)}
</div>

<div class="panel" id="panel-bag">
{bag('weapon',True,'\u957f\u5251','\u5378\u4e0b')}
{bag('armor',True,'\u666e\u901a\u5e03\u8863','\u5378\u4e0b')}
{bag('food',False,'\u725b\u76ae\u9152\u888b','\u559d')}
{bag('food',False,'\u9992\u5934 \u00d73','\u5403')}
{bag('drug',False,'\u91d1\u521b\u836f','\u7528')}
{bag('money',False,'\u767d\u94f6\u5341\u4e24','\u67e5\u770b')}
{bag('misc',False,'\u706b\u6298','\u67e5\u770b')}
</div>

</div></div></div>
"""

'''

SKILL_FN = r'''def skill(cls, name, m, lv, level, learned, enabled):
    need = (level + 1) * (level + 1)
    remain = max(0, need - learned)
    pct = min(100, int(learned * 100 / need)) if need else 0
    eq = '<span class="eq">\u25a1</span>' if enabled else ''
    return (
        f'<div class="skill-row {cls}"><div class="skill-main"><div class="name">{eq}<span class="name">{name}</span></div>'
        f'<div class="skill-prog">\u5347\u7ea7 {learned}/{need}\uff08\u8fd8\u5dee {remain}\uff09'
        f'<div class="bar"><i style="width:{pct}%"></i></div></div></div>'
        f'<div class="skill-sec"><span class="lv {m}">{lv}</span><div class="num">Lv{level}</div></div></div>'
    )


'''


def patch_simple_sheets(text: str) -> str:
    """Wrap content of exit/obj/train/fight/map sheets in sheet-scroll where missing."""
    # exit overlay
    text = text.replace(
        """<div class="overlay" id="exitOverlay"><div class="sheet">
<div class="sheet-top"><div><h3 id="exitTitle"></h3><div class="sub">""" + "\u786e\u8ba4\u524d\u8fdb" + r"""</div></div>
<button type="button" class="close" data-close>&times;</button></div>
<p class="body" id="exitDesc"></p>
<div class="sheet-acts"><button type="button" data-close>""" + "\u7559\u4e0b" + r"""</button>
<button type="button" class="go" id="btnGo">""" + "\u524d\u5f80" + r"""</button></div></div></div>""",
        """<div class="overlay" id="exitOverlay"><div class="sheet">
<div class="sheet-top"><div><h3 id="exitTitle"></h3><div class="sub">""" + "\u786e\u8ba4\u524d\u8fdb" + r"""</div></div>
<button type="button" class="close" data-close>&times;</button></div>
<div class="sheet-scroll"><p class="body" id="exitDesc"></p></div>
<div class="sheet-acts"><button type="button" data-close>""" + "\u7559\u4e0b" + r"""</button>
<button type="button" class="go" id="btnGo">""" + "\u524d\u5f80" + r"""</button></div></div></div>""",
        1,
    )

    # map-card: add map-scroll wrapper around floor content - softer approach via CSS height already
    text = text.replace(
        '<div class="overlay center" id="mapOverlay"><div class="map-card">\n<header>',
        '<div class="overlay center" id="mapOverlay"><div class="map-card">\n<header>',
        1,
    )
    if 'class="map-scroll"' not in text:
        text = text.replace(
            '<p class="map-legend">',
            '<div class="map-scroll"><p class="map-legend">',
            1,
        )
        text = text.replace(
            '<p class="map-tip">',
            '</div><p class="map-tip">',
            1,
        )

    # train overlay wrap options in scroll
    if 'id="trainOverlay"' in text and 'trainOverlay' in text:
        text = text.replace(
            """<div class="overlay" id="trainOverlay"><div class="sheet">
<div class="sheet-top"><div><h3>\u4fee\u70bc</h3><div class="sub">\u9009\u62e9\u4fee\u70bc\u65b9\u5f0f</div></div>
<button type="button" class="close" data-close>&times;</button></div>
<div class="train-opts">""",
            """<div class="overlay" id="trainOverlay"><div class="sheet">
<div class="sheet-top"><div><h3>\u4fee\u70bc</h3><div class="sub">\u9009\u62e9\u4fee\u70bc\u65b9\u5f0f</div></div>
<button type="button" class="close" data-close>&times;</button></div>
<div class="sheet-scroll"><div class="train-opts">""",
            1,
        )
        text = text.replace(
            """</div>
<div class="progress-box" id="trainProgress">""",
            """</div>
<div class="progress-box" id="trainProgress">""",
            1,
        )
        # close scroll before sheet-acts of train
        text = text.replace(
            """</div>
<div class="sheet-acts"><button type="button" data-close>\u5173\u95ed</button><button type="button" class="danger" id="btnHalt" disabled>\u505c\u6b62</button></div>
</div></div>
<div class="overlay" id="fightPickOverlay">""",
            """</div></div>
<div class="sheet-acts"><button type="button" data-close>\u5173\u95ed</button><button type="button" class="danger" id="btnHalt" disabled>\u505c\u6b62</button></div>
</div></div>
<div class="overlay" id="fightPickOverlay">""",
            1,
        )

    # fight pick + combat: wrap body in scroll
    text = text.replace(
        """<div class="overlay" id="fightPickOverlay"><div class="sheet">
<div class="sheet-top"><div><h3>\u52a8\u624b</h3><div class="sub">\u9009\u62e9\u4ea4\u624b\u5bf9\u8c61</div></div>
<button type="button" class="close" data-close>&times;</button></div>
<p class="body">\u573a\u4e0a\u53ef\u4ea4\u624b\u7684\u4eba\u7269\uff1a</p>
<div class="sheet-acts col">""",
        """<div class="overlay" id="fightPickOverlay"><div class="sheet">
<div class="sheet-top"><div><h3>\u52a8\u624b</h3><div class="sub">\u9009\u62e9\u4ea4\u624b\u5bf9\u8c61</div></div>
<button type="button" class="close" data-close>&times;</button></div>
<div class="sheet-scroll"><p class="body">\u573a\u4e0a\u53ef\u4ea4\u624b\u7684\u4eba\u7269\uff1a</p></div>
<div class="sheet-acts col">""",
        1,
    )
    text = text.replace(
        """<div class="overlay" id="combatOverlay"><div class="sheet">
<div class="sheet-top"><div><h3>\u4e0e\u5e97\u5c0f\u4e8c\u4ea4\u624b</h3><div class="sub">\u6218\u6597\u8fdb\u884c\u4e2d</div></div>
<button type="button" class="close" data-close>&times;</button></div>
<div class="combat-vitals">""",
        """<div class="overlay" id="combatOverlay"><div class="sheet">
<div class="sheet-top"><div><h3>\u4e0e\u5e97\u5c0f\u4e8c\u4ea4\u624b</h3><div class="sub">\u6218\u6597\u8fdb\u884c\u4e2d</div></div>
<button type="button" class="close" data-close>&times;</button></div>
<div class="sheet-scroll"><div class="combat-vitals">""",
        1,
    )
    text = text.replace(
        """</div>
<div class="sheet-acts row3"><button type="button" id="btnPerform">\u7edd\u62db</button><button type="button" data-close>\u505c\u624b</button><button type="button" class="danger" data-close>\u9003\u8dd1</button></div>
</div></div>
""",
        """</div></div>
<div class="sheet-acts row3"><button type="button" id="btnPerform">\u7edd\u62db</button><button type="button" data-close>\u505c\u624b</button><button type="button" class="danger" data-close>\u9003\u8dd1</button></div>
</div></div>
""",
        1,
    )

    # obj overlay scroll
    text = text.replace(
        """<div class="overlay" id="objOverlay"><div class="sheet">
<div class="sheet-top"><div><h3 id="objTitle"></h3><div class="sub" id="objSub"></div></div>
<button type="button" class="close" data-close>&times;</button></div>
<p class="body" id="objDesc"></p>
<div class="sheet-acts row4" id="objActs"></div></div></div>""",
        """<div class="overlay" id="objOverlay"><div class="sheet">
<div class="sheet-top"><div><h3 id="objTitle"></h3><div class="sub" id="objSub"></div></div>
<button type="button" class="close" data-close>&times;</button></div>
<div class="sheet-scroll"><p class="body" id="objDesc"></p></div>
<div class="sheet-acts row4" id="objActs"></div></div></div>""",
        1,
    )

    # flex-shrink 0 for sheet-top, tabs, sheet-acts
    if ".sheet-top,.tabs,.sheet-acts{flex-shrink:0}" not in text:
        text = text.replace(
            ".sheet-scroll{flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch}",
            ".sheet-top,.tabs,.sheet-acts{flex-shrink:0}"
            ".sheet-scroll{flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch}",
            1,
        )
    return text


if __name__ == "__main__":
    main()
