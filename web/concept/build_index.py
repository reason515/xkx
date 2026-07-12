# -*- coding: utf-8 -*-
"""Generate web/concept/index.html as UTF-8. Source stays ASCII via \\u escapes."""
from pathlib import Path

OUT = Path(__file__).with_name("index.html")

def main():
    # Payload is zlib+base64 of utf-8 html; generated below if missing.
    # For first run we compose HTML in Python with unicode escapes.
    html = compose()
    OUT.write_text(html, encoding="utf-8", newline="\n")
    sample = OUT.read_bytes()[:80]
    assert "\u4fa0\u5ba2\u884c".encode("utf-8") in OUT.read_bytes()
    print("wrote", OUT, "bytes", OUT.stat().st_size)

def compose():
    # Keep CSS external (tokens.css). Inline layout CSS as ASCII-heavy; Chinese only in content.
    css = r"""
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100dvh;font-family:var(--font-body);color:var(--paper);background:radial-gradient(ellipse 100% 70% at 50% 0%,#243028 0%,transparent 50%),linear-gradient(165deg,#0c0b0a,#151310 45%,#0f1210);display:grid;place-items:center;padding:24px 16px}
.page-note{position:fixed;top:16px;left:16px;max-width:270px;font-size:12px;line-height:1.65;color:var(--paper-dim);z-index:1}
.page-note strong{display:block;font-family:var(--font-display);font-size:15px;color:var(--paper);font-weight:400;margin-bottom:4px}
.phone{width:min(390px,100%);height:min(844px,calc(100dvh - 48px));background:var(--ink);border-radius:36px;border:1px solid rgba(232,223,208,.16);box-shadow:0 28px 70px rgba(0,0,0,.5);overflow:hidden;display:flex;flex-direction:column;position:relative;z-index:2}
.phone::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 80% 40% at 80% 8%,rgba(95,143,120,.1),transparent 55%),radial-gradient(ellipse 60% 30% at 10% 20%,rgba(181,74,58,.06),transparent 50%);pointer-events:none;z-index:0}
.screen{position:relative;z-index:1;flex:1;min-height:0;display:flex;flex-direction:column;padding-top:max(10px,var(--safe-t))}
.topbar{display:flex;align-items:center;gap:10px;padding:4px 14px 10px;border-bottom:1px solid var(--line);flex-shrink:0}
.hero-btn{flex:1;min-width:0;display:flex;align-items:center;gap:10px;background:transparent;border:none;color:inherit;text-align:left;cursor:pointer;padding:4px 6px 4px 2px;border-radius:10px;font-family:inherit}
.hero-btn:active{background:rgba(232,223,208,.06)}
.hero-name{font-family:var(--font-display);font-size:16px;letter-spacing:.1em;white-space:nowrap;display:flex;align-items:center;gap:4px}
.hero-name::after{content:"";width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid var(--paper-dim);opacity:.7;margin-top:2px}
.vitals{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0}
.vital{display:grid;grid-template-columns:1fr 32px;align-items:center;gap:6px;font-size:10px;color:var(--paper-dim)}
.bar{height:4px;border-radius:99px;background:rgba(232,223,208,.1);overflow:hidden}
.fill{height:100%;width:var(--w);border-radius:99px}
.hp .fill{background:linear-gradient(90deg,#6e2a25,var(--stat-qi))}
.sp .fill{background:linear-gradient(90deg,#3a5560,var(--stat-jing))}
.mp .fill{background:linear-gradient(90deg,#355a48,var(--stat-neili))}
.vital .n{text-align:right;font-variant-numeric:tabular-nums}
.map-btn{width:44px;height:44px;flex-shrink:0;border-radius:12px;border:1px solid var(--line-strong);background:rgba(95,143,120,.12);color:var(--jade-bright);cursor:pointer;display:grid;place-items:center;font-family:var(--font-display);font-size:13px;letter-spacing:.08em;line-height:1.15}
.map-btn:active{background:rgba(95,143,120,.28)}
.main{flex:1;min-height:0;overflow:auto;padding:14px 16px 8px;scrollbar-width:thin}
.room-title{font-family:var(--font-display);font-size:22px;letter-spacing:.14em;color:#f2eadc;margin-bottom:8px}
.room-desc{font-size:14px;line-height:1.8;color:var(--paper-dim);text-align:justify;margin-bottom:14px}
.room-desc.flash{animation:pulseText .7s ease}
@keyframes pulseText{0%,100%{color:var(--paper-dim)}40%{color:#f0e8da}}
.compass{display:flex;gap:6px;overflow-x:auto;margin-bottom:4px;scrollbar-width:none}
.compass::-webkit-scrollbar{display:none}
.compass-item{flex:0 0 auto;min-width:64px;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:rgba(232,223,208,.04);color:var(--paper-dim);font-size:11px;line-height:1.35;text-align:center;cursor:pointer;font-family:inherit}
.compass-item .d{display:block;font-family:var(--font-display);font-size:12px;letter-spacing:.12em;color:var(--jade-bright);margin-bottom:2px}
.compass-item.here{border-color:rgba(181,74,58,.45);background:rgba(181,74,58,.18);color:#f0d8d0;min-width:56px}
.compass-item.here .d{color:#e8b4aa}
.compass-item.vert{border-style:dashed;border-color:rgba(106,143,158,.45)}
.compass-hint{font-size:10px;color:rgba(185,173,152,.55);letter-spacing:.12em;margin-bottom:14px}
.context{display:flex;flex-direction:column;gap:14px}
.exit-hint{font-size:11px;color:var(--paper-dim);margin:-2px 0 8px;line-height:1.5}.ctx-block h2{font-family:var(--font-display);font-size:12px;letter-spacing:.28em;color:rgba(185,173,152,.7);font-weight:400;margin-bottom:8px}
.ctx-block.highlight{animation:glowBlock .9s ease}
@keyframes glowBlock{0%,100%{filter:none}40%{filter:drop-shadow(0 0 8px rgba(143,191,166,.35))}}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{appearance:none;border:1px solid var(--line-strong);background:rgba(232,223,208,.05);color:var(--paper);font-family:inherit;font-size:13px;line-height:1.3;padding:8px 12px;border-radius:999px;cursor:pointer}
.chip.exit{border-radius:10px;border-color:rgba(95,143,120,.45);background:rgba(95,143,120,.1);color:#d5ebe0}
.chip.exit .dir{color:var(--jade-bright);margin-right:6px;font-family:var(--font-display)}
.chip.npc{border-color:rgba(181,74,58,.35);color:#e8c4bc}
.chip.item{border-color:rgba(106,143,158,.4);color:#c5d7e0}
.log{margin-top:18px;padding-top:14px;border-top:1px solid var(--line)}
.log h2{font-family:var(--font-display);font-size:12px;letter-spacing:.28em;color:rgba(185,173,152,.7);font-weight:400;margin-bottom:8px}
.log p{font-size:13px;line-height:1.7;color:rgba(232,223,208,.7);margin-bottom:6px}
.log p.new{color:#e8dfd0;animation:fadeIn .35s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.log .hl{color:var(--cinnabar)}
.dock{flex-shrink:0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:10px 14px calc(12px + var(--safe-b));border-top:1px solid var(--line);background:linear-gradient(180deg,transparent,rgba(18,16,14,.95) 18%)}
.dock button{height:46px;border-radius:12px;border:1px solid var(--line-strong);background:rgba(232,223,208,.06);color:var(--paper);font-family:var(--font-display);font-size:16px;letter-spacing:.22em;cursor:pointer}
.dock .fight{background:linear-gradient(180deg,rgba(181,74,58,.42),rgba(140,48,40,.55));border-color:rgba(181,74,58,.5)}
.dock .busy{border-color:rgba(95,143,120,.55);color:var(--jade-bright)}
.toast{position:absolute;left:50%;top:22%;transform:translate(-50%,-8px);background:rgba(26,23,20,.94);border:1px solid var(--line-strong);color:var(--paper);padding:10px 16px;border-radius:999px;font-size:13px;opacity:0;pointer-events:none;transition:.2s;z-index:20;white-space:nowrap}
.toast.show{opacity:1;transform:translate(-50%,0)}
.overlay{position:absolute;inset:0;background:rgba(8,7,6,.55);z-index:10;display:flex;align-items:flex-end;opacity:0;pointer-events:none;transition:opacity .18s}
.overlay.open{opacity:1;pointer-events:auto}
.overlay.center{align-items:center;justify-content:center;padding:20px}
.sheet{width:100%;height:min(620px,78dvh);max-height:78dvh;background:var(--ink-lift);border-radius:20px 20px 0 0;border:1px solid var(--line-strong);border-bottom:none;padding:16px 16px calc(14px + var(--safe-b));transform:translateY(16px);transition:transform .2s;overflow:hidden;display:flex;flex-direction:column}
.overlay.open .sheet{transform:translateY(0)}
.sheet-top,.tabs,.sheet-acts{flex-shrink:0}.sheet-scroll{flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch}
.map-card{height:min(620px,78dvh);max-height:78dvh;display:flex;flex-direction:column;overflow:hidden}
.map-card .map-scroll{flex:1;min-height:0;overflow:auto}
.sheet-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
.sheet h3{font-family:var(--font-display);font-size:20px;letter-spacing:.12em;font-weight:400}
.sheet .sub{font-size:12px;color:var(--jade-bright);letter-spacing:.08em;margin-top:4px}
.sheet .close{width:32px;height:32px;border-radius:8px;border:1px solid var(--line);background:transparent;color:var(--paper-dim);font-size:18px;cursor:pointer;line-height:1;flex-shrink:0}
.sheet .body{font-size:13px;line-height:1.75;color:var(--paper-dim);margin-bottom:16px}
.sheet-acts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sheet-acts.row3{grid-template-columns:1fr 1fr 1fr}
.sheet-acts.row4{grid-template-columns:repeat(4,1fr)}
.sheet-acts.col{grid-template-columns:1fr}
.sheet-acts button{height:42px;border-radius:10px;border:1px solid var(--line-strong);background:rgba(232,223,208,.06);color:var(--paper);font-family:var(--font-display);font-size:15px;letter-spacing:.16em;cursor:pointer}
.sheet-acts .go{grid-column:1/-1;background:linear-gradient(180deg,rgba(95,143,120,.45),rgba(60,100,80,.55));border-color:rgba(95,143,120,.55);height:46px;letter-spacing:.28em;font-size:16px}
.sheet-acts .danger{border-color:rgba(181,74,58,.45);color:#e8b4aa}
.sheet-acts .primary-cinnabar{background:linear-gradient(180deg,rgba(181,74,58,.42),rgba(140,48,40,.55));border-color:rgba(181,74,58,.5)}
.tabs{display:flex;gap:4px;margin-bottom:14px;background:rgba(0,0,0,.25);padding:4px;border-radius:10px;overflow-x:auto;scrollbar-width:none}
.tabs button{flex:0 0 auto;height:32px;padding:0 12px;border:none;border-radius:8px;background:transparent;color:var(--paper-dim);font-family:var(--font-display);letter-spacing:.14em;font-size:13px;cursor:pointer;white-space:nowrap}
.tabs button.on{background:rgba(232,223,208,.1);color:var(--paper)}
.panel{display:none}.panel.on{display:block}
.meter-list{display:flex;flex-direction:column;gap:12px}
.meter{--meter:var(--paper-dim)}
.meter-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px;font-size:13px}
.meter-head .label{font-family:var(--font-display);letter-spacing:.12em;color:var(--meter)}
.meter-head .val{font-variant-numeric:tabular-nums;color:var(--paper);font-size:12px}
.meter-head .val small{color:var(--paper-dim);font-size:11px;margin-left:4px}
.meter-track{height:8px;border-radius:99px;background:rgba(0,0,0,.35);overflow:hidden;border:1px solid color-mix(in srgb,var(--meter) 28%,transparent)}
.meter-fill{height:100%;width:var(--p);border-radius:99px;background:linear-gradient(90deg,color-mix(in srgb,var(--meter) 70%,#000),var(--meter))}
.meter.qi{--meter:var(--stat-qi)}.meter.jing{--meter:var(--stat-jing)}.meter.jingli{--meter:var(--stat-jingli)}.meter.neili{--meter:var(--stat-neili)}.meter.food{--meter:var(--stat-food)}.meter.water{--meter:var(--stat-water)}.meter.potential{--meter:var(--stat-potential)}
.meter-note{margin-top:14px;font-size:12px;color:var(--paper-dim)}.meter-note .exp{color:var(--stat-exp)}
.profile-line{font-size:13px;line-height:1.75;color:var(--paper-dim);margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--line)}
.profile-line strong{color:var(--paper);font-weight:600}
.attr-list{display:flex;flex-direction:column}
.attr-row{display:grid;grid-template-columns:3.5em 1fr;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);font-size:13px}
.attr-row.head{padding-top:0;padding-bottom:6px;border-bottom:1px solid var(--line-strong);font-size:11px;color:var(--paper-dim)}
.attr-row .name{font-family:var(--font-display);letter-spacing:.1em}
.attr-row.str .name{color:var(--attr-str)}.attr-row.int .name{color:var(--attr-int)}.attr-row.con .name{color:var(--attr-con)}.attr-row.dex .name{color:var(--attr-dex)}
.attr-row .nums{font-variant-numeric:tabular-nums;color:var(--paper);text-align:right}
.attr-row .nums .sep{color:var(--paper-dim);margin:0 8px}.attr-row .nums .base{color:var(--paper-dim)}
.attr-legend{margin-top:10px;font-size:11px;color:var(--paper-dim);line-height:1.5}
.look-block{font-size:13px;line-height:1.75;color:var(--paper-dim)}
.look-block .wear{margin-top:10px;padding-top:10px;border-top:1px solid var(--line)}
.look-block .wear li{list-style:none;padding:5px 0}
.look-block .wear .eq{color:var(--item-equipped);margin-right:6px}
.look-block .wear .t-weapon{color:var(--item-weapon)}.look-block .wear .t-armor{color:var(--item-armor)}.look-block .wear .t-food{color:var(--item-food)}
.skill-row{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);font-size:13px}
.skill-row .name{font-family:var(--font-display);letter-spacing:.06em}
.skill-row.force .name{color:var(--skill-force)}.skill-row.weapon .name{color:var(--skill-weapon)}.skill-row.dodge .name{color:var(--skill-dodge)}.skill-row.knowledge .name{color:var(--skill-knowledge)}
.skill-row .lv{font-size:12px}.skill-row .lv.m1{color:var(--mastery-1)}.skill-row .lv.m2{color:var(--mastery-2)}.skill-row .lv.m3{color:var(--mastery-3)}.skill-row .lv.m4{color:var(--mastery-4)}.skill-row .lv.m5{color:var(--mastery-5)}.skill-row .lv.m6{color:var(--mastery-6)}
.skill-row .num{color:var(--paper-dim);font-variant-numeric:tabular-nums;min-width:2em;text-align:right}
.bag-item{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);font-size:14px}
.bag-item .iname{display:flex;align-items:center;gap:6px}
.bag-item.weapon .iname{color:var(--item-weapon)}.bag-item.armor .iname{color:var(--item-armor)}.bag-item.food .iname{color:var(--item-food)}.bag-item.money .iname{color:var(--item-money)}.bag-item.drug .iname{color:var(--item-drug)}.bag-item.misc .iname{color:var(--item-misc)}
.bag-item .eq-mark{color:var(--item-equipped);font-size:12px}
.bag-item button{border:1px solid var(--line-strong);background:transparent;color:var(--jade-bright);font-size:12px;letter-spacing:.1em;padding:4px 10px;border-radius:999px;font-family:inherit;cursor:pointer}
.map-card{width:100%;max-height:88%;background:#171512;border:1px solid var(--line-strong);border-radius:18px;padding:16px;overflow:auto}
.map-card header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.map-card h3{font-family:var(--font-display);font-size:18px;letter-spacing:.14em;font-weight:400}
.floors{display:flex;gap:6px;margin-bottom:10px}
.floors button{flex:1;height:34px;border-radius:8px;border:1px solid var(--line);background:transparent;color:var(--paper-dim);font-family:var(--font-display);letter-spacing:.12em;cursor:pointer}
.floors button.on{background:rgba(95,143,120,.2);border-color:rgba(95,143,120,.45);color:var(--paper)}
.map-legend{font-size:11px;color:var(--paper-dim);margin-bottom:10px;line-height:1.5}
.floor-pane{display:none}.floor-pane.on{display:block}
.city-map{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.city-map .cell{min-height:48px;border-radius:6px;background:rgba(232,223,208,.04);border:1px solid transparent;font-size:10px;color:rgba(232,223,208,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4px 2px;line-height:1.2;gap:2px}
.city-map .cell.road{background:rgba(95,143,120,.12);color:rgba(232,223,208,.7);border-color:rgba(95,143,120,.2)}
.city-map .cell.here{background:rgba(181,74,58,.4);color:#f5e6e0;border-color:rgba(181,74,58,.6)}
.city-map .cell.landmark{background:rgba(106,143,158,.18);color:#cfe0e8;border-color:rgba(106,143,158,.3)}
.cell .vert-tag{font-size:9px;color:#9ec4d4}
.map-tip{margin-top:12px;font-size:12px;line-height:1.6;color:var(--paper-dim)}
.train-opts{display:grid;gap:8px;margin-bottom:14px}
.train-opt{text-align:left;padding:12px 14px;border-radius:12px;border:1px solid var(--line-strong);background:rgba(232,223,208,.05);color:var(--paper);cursor:pointer;font-family:inherit}
.train-opt strong{display:block;font-family:var(--font-display);font-size:16px;letter-spacing:.16em;font-weight:400;margin-bottom:4px}
.train-opt span{font-size:12px;color:var(--paper-dim);line-height:1.5}
.train-opt.on{border-color:rgba(95,143,120,.55);background:rgba(95,143,120,.15)}
.progress-box{display:none;margin-bottom:14px;padding:12px;border-radius:12px;border:1px solid rgba(95,143,120,.35);background:rgba(95,143,120,.08)}
.progress-box.on{display:block}.progress-box .t{font-size:13px;margin-bottom:8px;color:var(--jade-bright)}
.progress-track{height:6px;border-radius:99px;background:rgba(0,0,0,.35);overflow:hidden}
.progress-track i{display:block;height:100%;width:42%;background:linear-gradient(90deg,var(--jade),var(--jade-bright));border-radius:99px;animation:grow 2.4s ease infinite alternate}
@keyframes grow{from{width:28%}to{width:78%}}
.combat-log{max-height:180px;overflow:auto;margin-bottom:12px;padding:10px 12px;border-radius:10px;background:rgba(0,0,0,.28);border:1px solid var(--line);font-size:13px;line-height:1.7;color:rgba(232,223,208,.78)}
.combat-log .hit{color:#e8b4aa}.combat-log .sys{color:var(--jade-bright);font-size:12px}
.combat-vitals{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;font-size:12px;color:var(--paper-dim)}
.combat-vitals .who{margin-bottom:4px;color:var(--paper)}

.scalar-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;margin-top:14px}
.scalar{padding:10px 0;border-bottom:1px solid var(--line);font-size:13px;display:flex;justify-content:space-between;color:var(--paper-dim)}
.scalar .v{color:var(--paper);font-variant-numeric:tabular-nums}
.scalar.exp .v{color:var(--stat-exp)}.scalar.pot .v{color:var(--stat-potential)}.scalar.shen .v{color:var(--stat-shen)}
.combat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
.combat-pill{padding:10px 12px;border-radius:10px;border:1px solid var(--line-strong);background:rgba(232,223,208,.04)}
.combat-pill .k{font-size:11px;color:var(--paper-dim);letter-spacing:.12em;margin-bottom:4px;font-family:var(--font-display)}
.combat-pill .v{font-size:18px;color:var(--paper);font-variant-numeric:tabular-nums}
.combat-pill.atk .v{color:var(--cinnabar)}.combat-pill.def .v{color:var(--jade-bright)}
.enabled-box{margin-bottom:14px;padding:10px 12px;border-radius:12px;border:1px solid rgba(95,143,120,.3);background:rgba(95,143,120,.08)}
.enabled-box h4{font-family:var(--font-display);font-size:12px;letter-spacing:.2em;color:var(--jade-bright);font-weight:400;margin-bottom:8px}
.enabled-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:13px;border-bottom:1px solid var(--line)}
.enabled-row:last-child{border-bottom:none}
.enabled-row .slot{color:var(--paper-dim);min-width:3em}
.enabled-row .sk{color:var(--skill-force)}
.enabled-row.weapon .sk{color:var(--skill-weapon)}
.enabled-row.dodge .sk{color:var(--skill-dodge)}
.enabled-row.parry .sk{color:var(--skill-parry)}
.enabled-row .eff{color:var(--paper);font-variant-numeric:tabular-nums;font-size:12px}
.skill-row{align-items:start}
.skill-main{display:flex;flex-direction:column;gap:3px;min-width:0}
.skill-main .name{display:flex;align-items:center;gap:6px}
.skill-main .eq{color:var(--item-equipped);font-size:12px}
.skill-prog{font-size:11px;color:var(--paper-dim)}
.skill-prog .bar{height:3px;margin-top:4px;border-radius:99px;background:rgba(0,0,0,.35);overflow:hidden}
.skill-prog .bar i{display:block;height:100%;background:var(--jade);border-radius:99px}
.skill-sec{text-align:right}

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
@media (max-width:480px){body{padding:0}.page-note{display:none}.phone{width:100%;height:100dvh;border-radius:0;border:none;box-shadow:none}}
"""

    # Chinese strings via unicode escapes (ASCII-safe source)
    t = {
        "title": "\u4fa0\u5ba2\u884c \u00b7 \u79fb\u52a8\u7aef\u754c\u9762\u6982\u5ff5 v6",
        "note_h": "\u6982\u5ff5\u7a3f v6",
        "note_p": "\u89d2\u8272\u9762\u677f\u5df2\u6309\u8bbe\u8ba1 token \u4e0a\u8272\uff1b\u6587\u6848\u53ea\u4fdd\u7559\u5bf9\u73a9\u5bb6\u6709\u7528\u7684\u4fe1\u606f\u3002\u89c4\u8303\u89c1 .cursor/skills/xkx-web-ui\u3002",
        "name": "\u9752\u4e91",
        "map": "\u5730<br>\u56fe",
        "room": "\u626c\u5dde\u5ba2\u5e97",
        "desc": "\u8fd9\u662f\u4e00\u5bb6\u4ef7\u94b1\u4f4e\u5ec9\u7684\u5ba2\u6808\uff0c\u751f\u610f\u975e\u5e38\u5174\u9686\u3002\u5916\u5730\u6e38\u5ba2\u591a\u9009\u62e9\u8fd9\u91cc\u843d\u811a\u3002\u5e97\u5c0f\u4e8c\u91cc\u91cc\u5916\u5916\u5fd9\u5f97\u56e2\u56e2\u8f6c\uff0c\u63a5\u5f85\u7740\u5357\u8154\u5317\u8c03\u7684\u5ba2\u4eba\u3002\u5899\u4e0a\u6302\u7740\u4e00\u4e2a\u724c\u5b50\u3002",
        "hint": "\u90bb\u8fd1\u65b9\u4f4d \u00b7 \u70b9\u9009\u9884\u89c8 \u00b7 \u5b8c\u6574\u5730\u56fe\u89c1\u53f3\u4e0a\u89d2",
        "exits": "\u51fa\u53e3",
        "objs": "\u4eba\u7269 \u00b7 \u7269\u54c1",
        "logh": "\u89c1\u95fb",
        "look": "\u73af\u987e",
        "train": "\u4fee\u70bc",
        "fight": "\u52a8\u624b",
    }

    # Due to size limits, emit a focused v4 page emphasizing the character panel + main layout.
    # Full interactive scripts included.

    body_main = f"""
<aside class="page-note"><strong>{t['note_h']}</strong>{t['note_p']}</aside>
<div class="phone" id="app">
<div class="toast" id="toast"></div>
<div class="screen">
<header class="topbar">
<button type="button" class="hero-btn" id="openHero">
<div class="hero-name">{t['name']}</div>
<div class="vitals">
<div class="vital hp"><div class="bar"><div class="fill" style="--w:78%"></div></div><span class="n">390</span></div>
<div class="vital sp"><div class="bar"><div class="fill" style="--w:92%"></div></div><span class="n">460</span></div>
<div class="vital mp"><div class="bar"><div class="fill" style="--w:55%"></div></div><span class="n">220</span></div>
</div>
</button>
<button type="button" class="map-btn" id="openMap">{t['map']}</button>
</header>
<div class="main" id="mainScroll">
<h1 class="room-title">{t['room']}</h1>
<p class="room-desc" id="roomDesc">{t['desc']}</p>
{context_block()}
{log_block()}
</div>
<footer class="dock">
<button type="button" id="btnLook">{t['look']}</button>
<button type="button" id="btnTrain">{t['train']}</button>
<button type="button" class="fight" id="btnFight">{t['fight']}</button>
</footer>
</div>
{overlays()}
</div>
{script_block()}
"""

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>{t['title']}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=ZCOOL+XiaoWei&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="./tokens.css" />
<style>{css}</style>
</head>
<body>
{body_main}
</body>
</html>
"""


def compass_block():
    items = [
        ("north", "\u9a6c\u53a9", "\u5317", "\u5317\u8fb9\u8fde\u7740\u5ba2\u5e97\u7684\u9a6c\u53a9\uff0c\u9690\u9690\u6709\u9a6c\u5636\u58f0\u3002", ""),
        ("west", "\u82b1\u5e97", "\u897f", "\u897f\u8fb9\u662f\u4e00\u5bb6\u82b1\u5e97\uff0c\u95e8\u524d\u6446\u7740\u51e0\u76c6\u65f6\u4ee4\u9c9c\u82b1\u3002", ""),
        ("here", "\u5ba2\u5e97", "\u6b64", "", "here"),
        ("east", "\u5317\u5927\u8857", "\u4e1c", "\u4e1c\u8fb9\u662f\u70ed\u95f9\u7684\u5317\u5927\u8857\uff0c\u884c\u4eba\u6765\u6765\u5f80\u5f80\u3002", ""),
        ("south", "\u9a7f\u7ad9", "\u5357", "\u5357\u8fb9\u662f\u626c\u5dde\u9a7f\u7ad9\uff0c\u4fe1\u4f7f\u4e0e\u811a\u592b\u8fdb\u8fdb\u51fa\u51fa\u3002", ""),
        ("up", "\u96c5\u623f", "\u4e0a", "\u697c\u4e0a\u662f\u96c5\u623f\uff0c\u6bcf\u591c\u4e94\u4e24\u767d\u94f6\u3002\u697c\u68af\u54d7\u5440\u4f5c\u54cd\u3002", "vert"),
    ]
    parts = ['<div class="compass" id="compass">']
    for key, name, d, desc, cls in items:
        if key == "here":
            parts.append(f'<button type="button" class="compass-item here" id="compassHere"><span class="d">{d}</span>{name}</button>')
        else:
            parts.append(
                f'<button type="button" class="compass-item {cls}" data-exit="{key}" data-name="{name}" data-desc="{desc}">'
                f'<span class="d">{d}</span>{name}</button>'
            )
    parts.append("</div>")
    return "\n".join(parts)


def context_block():
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
        + cell("north", "\u5317", "\u9a6c\u53a9", "\u5317\u8fb9\u8fde\u7740\u5ba2\u5e97\u7684\u9a6c\u53a9\uff0c\u9690\u9690\u6709\u9a6c\u5636\u58f0\u3002")
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


def log_block():
    return """
<section class="log"><h2>\u89c1\u95fb</h2><div id="logList">
<p>\u5e97\u5c0f\u4e8c\u7b11\u564b\u564b\u5730\u8d70\u4e86\u8fc7\u6765\u3002</p>
<p>\u4f60\u542c\u5230\u5916\u9762\u9690\u7ea6\u6709\u4eba\u558a\uff1a<span class="hl">\u300c\u8ba9\u4e00\u8ba9\u2014\u2014\u300d</span></p>
</div></section>
"""


def overlays():
    # Character panel is the focus of v4
    return r"""
<div class="overlay" id="exitOverlay"><div class="sheet">
<div class="sheet-top"><div><h3 id="exitTitle"></h3><div class="sub">""" + "\u786e\u8ba4\u524d\u8fdb" + r"""</div></div>
<button type="button" class="close" data-close>&times;</button></div>
<p class="body" id="exitDesc"></p>
<div class="sheet-acts"><button type="button" data-close>""" + "\u7559\u4e0b" + r"""</button>
<button type="button" class="go" id="btnGo">""" + "\u524d\u5f80" + r"""</button></div></div></div>

<div class="overlay" id="objOverlay"><div class="sheet">
<div class="sheet-top"><div><h3 id="objTitle"></h3><div class="sub" id="objSub"></div></div>
<button type="button" class="close" data-close>&times;</button></div>
<div class="sheet-scroll"><p class="body" id="objDesc"></p></div>
<div class="sheet-acts row4" id="objActs"></div></div></div>

""" + hero_overlay() + map_overlay() + train_overlay() + fight_overlays()


def hero_overlay():
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


def meter(cls, label, val, p):
    return f'<div class="meter {cls}"><div class="meter-head"><span class="label">{label}</span><span class="val">{val}</span></div><div class="meter-track"><div class="meter-fill" style="--p:{p}"></div></div></div>'


def attr(cls, name, cur, base):
    return f'<div class="attr-row {cls}"><span class="name">{name}</span><span class="nums"><span class="cur">{cur}</span><span class="sep">/</span><span class="base">{base}</span></span></div>'


def skill(cls, name, m, lv, level, learned, enabled):
    need = (level + 1) * (level + 1)
    pct = min(100, int(learned * 100 / need)) if need else 0
    eq = '<span class="eq">\u25a1</span>' if enabled else ''
    return (
        f'<div class="skill-row {cls}"><div class="skill-main">'
        f'<div class="name">{eq}<span class="skname">{name}</span></div>'
        f'<div class="barline"><i style="width:{pct}%"></i></div></div>'
        f'<div class="meta"><span class="lv {m}">{lv}</span><span class="num">Lv{level}</span></div></div>'
    )


def bag(cls, eq, name, act):
    mark = '<span class="eq-mark">\u25a1</span>' if eq else ''
    return f'<div class="bag-item {cls}"><span class="iname">{mark}{name}</span><button type="button">{act}</button></div>'


def map_overlay():
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
        (18, 42, "\u767d\u9a7c", "sect", False),
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


def train_overlay():
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


def fight_overlays():
    return """
<div class="overlay" id="fightPickOverlay"><div class="sheet">
<div class="sheet-top"><div><h3>\u52a8\u624b</h3><div class="sub">\u9009\u62e9\u4ea4\u624b\u5bf9\u8c61</div></div>
<button type="button" class="close" data-close>&times;</button></div>
<p class="body">\u573a\u4e0a\u53ef\u4ea4\u624b\u7684\u4eba\u7269\uff1a</p>
<div class="sheet-acts col"><button type="button" class="primary-cinnabar" id="pickXiaoer">\u5e97\u5c0f\u4e8c</button><button type="button" data-close>\u53d6\u6d88</button></div>
</div></div>
<div class="overlay" id="combatOverlay"><div class="sheet">
<div class="sheet-top"><div><h3>\u4e0e\u5e97\u5c0f\u4e8c\u4ea4\u624b</h3><div class="sub">\u6218\u6597\u8fdb\u884c\u4e2d</div></div>
<button type="button" class="close" data-close>&times;</button></div>
<div class="combat-vitals"><div><div class="who">\u4f60</div><div class="bar"><div class="fill" style="width:72%;background:var(--stat-qi);height:100%"></div></div></div>
<div><div class="who">\u5e97\u5c0f\u4e8c</div><div class="bar"><div class="fill" style="width:48%;background:#8a6a40;height:100%"></div></div></div></div>
<div class="combat-log" id="combatLog">
<p class="sys">\u4f60\u559d\u9053\uff1a\u300c\u770b\u62db\uff01\u300d</p>
<p>\u4f60\u4e00\u62db\u300c\u82cd\u677e\u8fce\u5ba2\u300d\uff0c\u5411\u5e97\u5c0f\u4e8c\u780d\u53bb\u3002</p>
<p class="hit">\u7ed3\u679c\u300c\u55e4\u300d\u5730\u4e00\u58f0\u5212\u7834\u5e97\u5c0f\u4e8c\u7684\u80a9\u8180\uff01</p>
</div>
<div class="sheet-acts row3"><button type="button" id="btnPerform">\u7edd\u62db</button><button type="button" data-close>\u505c\u624b</button><button type="button" class="danger" data-close>\u9003\u8dd1</button></div>
</div></div>
"""


def script_block():
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


