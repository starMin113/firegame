# 消防调度救援 · firegame

超休闲消防资源调配与发现游戏。玩家观察火场、铺设管网、开启水源，让火情逐步熄灭。

## 项目入口

- `game-design.md`：当前已确认设计与五关原型规则。
- `docs/firefighter-rescue-mvp-design-discussion.md`：设计讨论记录，包含待验证想法；不自动作为正式需求。
- `docs/firefighter_rescue_30_level_stress_test.xlsx`：30 关纸面压力测试和母题索引，不代表 30 关已制作完成。
- `mvp/site/`：从此前在线原型源码仓库恢复的 Web 工程，包含五关原型。
- `mvp/src/`：从独立 HTML 内恢复的可编辑规则、界面和样式源文件。
- `docs/cocos-project-package.original.json`：原目录的 Cocos Creator 3.8.8 项目标识备份；当前没有完整 Cocos 工程，勿作为根目录 npm 工程使用。

## 本地体验

直接用浏览器打开 `mvp/site/public/game.html`。该页面仍依赖联网加载 React 和 Babel。

运行网站外壳：在 `mvp/site` 执行 `npm ci`，然后执行 `npm run dev`。构建命令为 `npm run build`。

编辑 `mvp/src` 后，在仓库根目录执行 `node mvp/sync-prototype.cjs` 更新独立 HTML 和网站内的副本。

## 版本管理约定

后续工作以本仓库为准。设计、关卡、源码共同版本管理；不提交依赖、构建缓存、临时发布包或凭据。

`mvp/site/.openai/hosting.json` 保留既有站点标识。纳入 GitHub 不会自动发布网站，也尚未配置 GitHub 自动部署。

资料于 2026-11-03 从旧工作目录整合。外层原件保留作迁移备份，后续修改本仓库内文件。
