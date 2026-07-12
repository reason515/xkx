# Web 协议 v1 — mud 双输出 JSON 事件（Telnet 不可见 @@JSON@@ 块可被客户端剥离）

| 事件 type | 字段 | 说明 |
|-----------|------|------|
| `room.update` | title, long, exits[], npcs[], items[] | 场景 |
| `player.vitals` | vitals{} | 气血等 |
| `player.score` | text | 档案原文（后续结构化） |
| `player.look` | text | 仪容 |
| `skills.update` | skills[] | 武功列表 |
| `inv.update` | items[] | 行囊 |
| `combat.event` | text | 战报句 |
| `train.event` | text | 修炼叙事 |
| `assist.status` | active, message | 挂机状态 |
| `error` | message | 错误 |

传输格式：`@@JSON@@{...}@@ENDJSON@@` 单行附加在 tell_object 后。

版本号：所有事件含 `"v":1`。

实现：`adm/daemons/webd.c`；玩家需 `WEBD->mark_web(me)`（登录后首次 webassist 或 look 时标记）。
