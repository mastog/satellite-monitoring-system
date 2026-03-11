# Satellite Monitoring System

一个以卫星数据与可持续发展分析为核心的全栈平台，集成了：

- 实时轨道可视化（3D）
- SDG 指标分析与预测
- 社区内容与投票系统
- 科研文章/论文同步与检索
- 积分与成就系统
- 太空生存小游戏（OPS）

本 README 目标是作为项目的“单一事实来源（single source of truth）”，帮助你快速理解全站结构、组件职责、技术细节和启动方式。

## 1. 项目概览

### 1.1 核心定位

`Satellite Monitoring System` 是一个基于 Next.js App Router 的数据可视化与交互平台，将航天数据、SDG 评估、社区协作和游戏化机制融合在同一网站中。

### 1.2 功能模块总览

- **Dashboard（主页）**：系统态势、文章推荐、社区亮点、预警摘要。
- **Tracking（轨道追踪）**：地球三维场景、卫星点位、时间轴回溯、追踪目标管理。
- **SDG**：多区域可持续发展评分、趋势图、雷达图、预测和问答。
- **Science Lab**：科研文章/论文同步、标签、语义检索、投票。
- **Community**：帖子/评论/Vote，情绪趋势视图。
- **Profile**：用户成长、积分、奖章、MMD 角色查看器与商店。
- **OPS Game**：弹幕生存玩法、武器系统、敌潮与 Boss、升级选择与融合技能。
- **Admin**：管理员用户、帖子、评论管理。

## 2. 技术栈与选型

### 2.1 前端

- `Next.js 16`（App Router）
- `React 19`
- `TypeScript`（strict）
- `Tailwind CSS 4` + 全局 Design Tokens（`globals.css`）
- `Framer Motion`（UI 动效）
- `D3.js`（自定义图表）

### 2.2 三维与图形

- `three` + `@react-three/fiber` + `@react-three/drei`
- `@react-three/postprocessing`（Bloom 等视觉处理）
- MMD 相关运行时（`src/lib/mmd/*`）

### 2.3 数据与算法

- `satellite.js`（SGP4/TLE 传播）
- `@tensorflow/tfjs`（GRU/LSTM 预测流程）
- `compromise`（文本自动标签）
- `topojson-client` + `world-atlas`（地图几何）

### 2.4 状态与后端

- `Zustand`（多 store）
- `Prisma` + `SQLite`
- `jose` + `bcryptjs`（JWT + 密码哈希）

## 3. 快速开始

### 3.1 环境要求

- Node.js 20+
- pnpm 8+

### 3.2 安装依赖

```bash
pnpm install
```

### 3.3 环境变量

在项目根目录创建 `.env`：

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-this-to-a-random-secret-in-production"
MMD_BAKE_SECRET="change-this-to-a-random-secret-for-bake-export"
```

### 3.4 初始化数据库

```bash
pnpm db:migrate
pnpm db:seed
```

### 3.5 启动开发

```bash
pnpm dev
```

默认访问：`http://localhost:3000`

### 3.6 生产构建

```bash
pnpm build
pnpm start
```

### 3.7 数据刷新任务

项目提供下面两个脚本用于服务端数据刷新：

```bash
pnpm data:refresh
pnpm data:worker
```

- `pnpm data:refresh`：执行一次完整的数据刷新任务。
- `pnpm data:worker`：常驻运行后台刷新任务，周期性更新文章、论文、SDG、气候事件、TLE 和卫星位置快照。

### 3.8 代码质量

```bash
pnpm lint
```

## 4. 项目结构（全局）

```text
src/
  app/              # 页面路由 + API Route Handlers
  components/       # 页面组件、业务组件、游戏引擎/UI
  lib/              # 业务逻辑、算法、数据服务
  store/            # Zustand 状态管理
  hooks/            # 自定义 hooks
prisma/             # schema/migrations/seed
public/             # 静态资源（纹理、模型、wasm）
  mmd-bakes/        # 服务端导出的 MMD 预烘焙缓存
docs/               # 项目文档
scripts/            # 工具脚本
```

## 5. 页面路由（`src/app`）

| 路由         | 页面文件                     | 主要组件                                                       | 作用         |
| ------------ | ---------------------------- | -------------------------------------------------------------- | ------------ |
| `/`          | `src/app/page.tsx`           | `DashboardView`                                                | 平台总览     |
| `/tracking`  | `src/app/tracking/page.tsx`  | `EarthScene` + `TrackedSatellitesOverlay` + `TimelineScrubber` | 3D 卫星追踪  |
| `/sdg`       | `src/app/sdg/page.tsx`       | `SDGDashboard`                                                 | SDG 分析中心 |
| `/science`   | `src/app/science/page.tsx`   | `ScienceLab`                                                   | 科研内容     |
| `/community` | `src/app/community/page.tsx` | `CommunityHub`                                                 | 社区互动     |
| `/profile`   | `src/app/profile/page.tsx`   | `ProfileView`                                                  | 个人中心     |
| `/game`      | `src/app/game/page.tsx`      | 游戏容器 + 多个 HUD/Modal                                      | OPS 游戏     |
| `/ground`    | `src/app/ground/page.tsx`    | `GroundNetwork`                                                | 地面站网络   |
| `/climate`   | `src/app/climate/page.tsx`   | `ClimateMonitor`                                               | 气候事件分析 |
| `/history`   | `src/app/history/page.tsx`   | `HistoryView`                                                  | 历史时间线   |
| `/tech`      | `src/app/tech/page.tsx`      | `TechView`                                                     | 技术展示     |
| `/aurora`    | `src/app/aurora/page.tsx`    | `AuroraView`                                                   | 视觉演示     |
| `/about`     | `src/app/about/page.tsx`     | `AboutView`                                                    | 项目说明     |
| `/admin`     | `src/app/admin/page.tsx`     | `AdminDashboard`                                               | 管理后台     |

## 5.1 数据与缓存机制

- **Tracking（轨道追踪）**
  - 服务端缓存 TLE 数据，并生成卫星位置快照供客户端读取。
  - 客户端使用卫星快照结果渲染实时点位，并使用同一时间基准绘制轨迹。

- **Science / SDG / Climate**
  - 文章、论文、SDG 指标和气候事件通过服务端刷新任务获取并写入缓存。
  - 前端接口读取缓存结果，并返回最近一次抓取时间。

- **Profile / Character Viewer**
  - MMD 角色动画支持预烘焙缓存。
  - 角色查看器会优先读取服务器缓存，并在本地复用已有烘焙结果。

## 5.2 MMD 预烘焙缓存

- `src/app/mmd-bake-export/page.tsx`
  - 提供一个内部导出页面，用于批量触发浏览器侧烘焙并上传结果。

- `src/app/api/mmd/bakes/route.ts`
  - 提供烘焙缓存写入接口，并将结果写入 `public/mmd-bakes/`。

- `MMD_BAKE_SECRET`
  - 用于保护烘焙上传接口。

- `public/mmd-bakes/`
  - 存放预烘焙动画缓存文件。

## 6. 全量组件清单（`src/components`）

### 6.1 `components/layout`

- `src/components/layout/ClientShell.tsx`
  - 技术应用
    - `React + Next.js Client Component`：承载全站运行时生命周期。
    - `Zustand`：同步 app/auth/posts/points/notification 等跨页面状态。
    - `Fetch API`：初始化卫星、通知、投票、积分等数据。
  - 在该组件中的具体用法
    - 页面加载时执行会话恢复、偏好恢复、卫星数据初始化；登录态变化时执行数据重拉与本地状态清理。
    - 将主题色和 UI 缩放写入根 CSS 变量，实现全站即时生效。

- `src/components/layout/TopBar.tsx`
  - 技术应用
    - `next/navigation`：读取当前路由并驱动导航高亮。
    - `Framer Motion`：实现导航 hover/active 与面板过渡动效。
  - 在该组件中的具体用法
    - 路由状态与登录状态共同决定按钮集合与视觉状态。
    - 顶栏内聚合通知、语音和外观配置入口，形成统一控制台。

- `src/components/layout/Footer.tsx`
  - 技术应用
    - `Framer Motion + AnimatePresence`：折叠/展开动画。
  - 在该组件中的具体用法
    - 底栏在紧凑与信息丰富两种模式间切换，避免长期占用主内容高度。

- `src/components/layout/NotificationBell.tsx`
  - 技术应用
    - `Zustand`：读取通知列表与未读数。
    - `Fetch API`：同步已读状态到服务端。
    - `Framer Motion`：抽屉与角标脉冲动效。
  - 在该组件中的具体用法
    - 先本地更新已读状态再提交请求，减少交互等待感；失败时可通过轮询再对齐。

- `src/components/layout/AppearancePanel.tsx`
  - 技术应用
    - `Framer Motion`：面板弹出/收起与滑杆过渡。
    - `CSS Variables`：主题与缩放值实时下发。
  - 在该组件中的具体用法
    - 用户在面板选择的颜色和缩放直接写入全局变量，不需要逐组件传参。

- `src/components/layout/DashboardView.tsx`
  - 技术应用
    - `React hooks`：多数据源并发拉取与派生计算缓存。
    - `Zustand`：读取全站卫星、追踪、投票与用户状态。
  - 在该组件中的具体用法
    - 将原始接口数据重组为卡片指标、预警和推荐内容，而不是原样展示。

- `src/components/layout/VoiceAssistant.tsx`
  - 技术应用
    - `Web Speech API`：浏览器语音识别。
  - 在该组件中的具体用法
    - 将语音转文本后交给上层搜索/输入流程，失败时自动降级为无语音模式。

### 6.2 `components/ui`

- `src/components/ui/GlassPanel.tsx`
  - 技术应用
    - `Tailwind CSS`：负责结构布局、间距、响应式断点。
    - `CSS Variables`：承接主题令牌（边框透明度、辉光强度、背景层级、字体色阶）。
    - `React 组合模式`：通过 children/slot 方式复用同一容器协议。
  - 在该组件中的具体用法
    - 将“头部区、内容区、强调边线、角部装饰、hover 态”封装成统一容器语义。
    - 页面级组件只需要传入业务内容，不再关心玻璃质感、描边、阴影这些实现细节。
    - 当 `AppearancePanel` 修改 accent 时，这个组件会自动继承新变量，不需要额外逻辑。
  - 工程价值
    - 解决“同类面板样式逐渐漂移”的问题，保证全站视觉一致。
    - 降低重复 CSS 维护量，减少局部改样式引发的回归风险。

- `src/components/ui/StatCard.tsx`
  - 技术应用
    - `React props`：数据字段完全由外部驱动，卡片本身不持有业务状态。
    - `Framer Motion`：处理入场、hover、数值更新时的视觉反馈。
    - `CSS 变量色板`：趋势色/告警色由主题体系统一管理。
  - 在该组件中的具体用法
    - 把“标题、主值、副值、趋势标签、图标”固定成统一信息层级，避免每个页面自定义排布。
    - 在 Dashboard、Climate、Profile 等模块复用同一数据卡语法，降低认知切换成本。
    - 趋势变化使用统一动效而不是硬切，帮助用户更快感知状态变化方向。
  - 边界与稳定性
    - 对空值/异常值采用安全显示策略，避免出现 `NaN` 或布局塌陷。

- `src/components/ui/ScrollReveal.tsx`
  - 技术应用
    - `Framer Motion`：统一过渡曲线与时间常量。
    - `Intersection/viewport`：仅在进入可视区时触发动画。
    - `计数插值`：数字变化采用时间插值而非瞬时跳变。
  - 在该组件中的具体用法
    - 业务组件不再自己写滚动监听和触发条件，只需包裹内容即可获得统一 reveal 行为。
    - `AnimatedCounter` 将 KPI 从旧值平滑过渡到新值，提高数据阅读连续性。
    - `CornerBrackets` 作为设计语言部件，保证不同模块视觉符号一致。
  - 性能收益
    - 只在元素进入视区时才执行动画，减少首屏不必要动画计算。

- `src/components/ui/SatelliteInfoPanel.tsx`
  - 技术应用
    - `Zustand`：订阅 `selectedSatellite` 与追踪状态。
    - `单位换算工具`：根据用户偏好切换 km/mi 展示口径。
  - 在该组件中的具体用法
    - 追踪页点击卫星后，这里立即读取全局选中对象并展示同一份标准字段（高度、速度、类型等）。
    - 使用统一格式化逻辑，避免不同面板对同一数值显示不一致。
  - 工程价值
    - 把卫星详情解释层从 3D 场景中解耦，便于后续扩展更多字段而不污染场景代码。

- `src/components/ui/Tooltip.tsx`
  - 技术应用
    - `React`：提示层生命周期与显隐状态管理。
    - `定位计算`：根据触发元素与视窗边界动态选择方向。
    - `轻量过渡`：统一淡入淡出与延时策略。
  - 在该组件中的具体用法
    - 所有“说明气泡”都走同一套规则，避免某些模块 tooltip 挡住内容、某些模块方向反转异常。
    - 业务组件仅提供文案，定位与显示策略由此组件接管。
  - 边界处理
    - 靠近屏幕边缘时自动翻转方向，防止内容被裁剪。

- `src/components/ui/SvgIcon.tsx`
  - 技术应用
    - `配置映射`：图标标识到 SVG path 的集中映射。
    - `统一尺寸系统`：通过同一 props 规范控制宽高与线宽感知。
  - 在该组件中的具体用法
    - 页面只声明语义名（例如 warning/info/ship），图标几何由中心映射层统一提供。
    - 确保 TopBar、Card、Modal 使用同一图形源，避免重复内联 SVG。
  - 工程价值
    - 后续替换图标风格时只改一处映射，不需要全项目搜改。

- `src/components/ui/InfoIcon.tsx`
  - 技术应用
    - `Tooltip 组合模式`：将触发器与解释层绑定为单一原子组件。
  - 在该组件中的具体用法
    - 在技能卡、设置项、图表标题旁统一提供“悬停看解释”的入口。
    - 统一交互行为，避免某些页面 click 打开、某些页面 hover 打开的混乱体验。

- `src/components/ui/MedalIcon.tsx`
  - 技术应用
    - `配置驱动渲染`：奖章 ID 对应颜色、图形、描边策略。
    - `React 纯展示组件`：不耦合业务状态，只负责视觉表达。
  - 在该组件中的具体用法
    - Profile、UserHoverCard、排名列表共享同一奖章视觉资产，杜绝“同奖章不同图标”的问题。
    - 支持尺寸参数，适配列表小图标和详情大图标两个场景。
  - 工程价值
    - 奖章体系扩容时只需扩展映射表，不必改动消费方组件。

- `src/components/ui/VoteButtons.tsx`
  - 技术应用
    - `Zustand`：读取当前用户投票态与聚合计数。
    - `Optimistic update`：先本地更新后异步提交。
    - `失败回滚`：请求失败恢复旧状态。
  - 在该组件中的具体用法
    - 点击支持/反对后，按钮状态和计数立即变化，用户无需等待网络响应。
    - 服务端拒绝或网络异常时回滚到提交前状态，保证最终数据一致。
  - 工程价值
    - 在高互动区域同时满足“快反馈”和“正确账本”两类需求。

### 6.3 `components/3d`

- `src/components/3d/EarthScene.tsx`
  - 技术应用
    - `Three.js`：负责地球网格、材质、灯光、轨道对象和场景图层管理。
    - `React Three Fiber`：把 Three 场景更新整合到 React 生命周期与状态更新节奏中。
    - `Drei`：提供相机控制与常用 3D 辅助抽象，减少样板代码。
    - `Postprocessing`：用于发光与层次强化，提升目标可读性。
    - `Zustand`：消费卫星列表、追踪列表、选中对象与时间偏移状态。
  - 在该组件中的具体用法
    - 把“卫星数据”转换成可交互三维对象：渲染点位、区分类型、处理选中高亮和点击拾取。
    - 结合时间轴状态实现同一场景下的“实时视图”和“回放视图”切换，而不更换页面。
    - 与 overlay 和 info panel 协同：场景负责空间定位，面板负责语义解释，避免职责混杂。
  - 性能与稳定性
    - 通过可见卫星集合裁剪渲染对象数量，避免全量卫星同时渲染引发掉帧。
    - 纹理/资源失败时采用降级展示策略，保证页面保持可用而非白屏。
    - 场景状态变化以增量更新为主，减少无意义重建。

- `src/components/3d/TrackedSatellitesOverlay.tsx`
  - 技术应用
    - `React overlay`：在 3D 画布之上渲染信息层。
    - `Zustand`：订阅追踪目标和选中对象状态。
  - 在该组件中的具体用法
    - 将“追踪中的卫星”转换为文本与状态提示，解决纯 3D 点位语义不足的问题。
    - 与 EarthScene 解耦：场景不负责长文本与状态徽章，overlay 负责信息表达。
  - 工程价值
    - 降低场景组件复杂度，让“空间渲染”和“信息呈现”分层维护。

- `src/components/3d/TimelineScrubber.tsx`
  - 技术应用
    - `Zustand`：统一管理 `timeOffset`、`simulationSpeed`、暂停状态。
    - `UI 控件状态机`：滑杆、播放、倍率切换行为协调。
  - 在该组件中的具体用法
    - 将用户输入转换为时间偏移参数，驱动传播层重新计算卫星位置。
    - 倍率控制影响时间推进速度，暂停控制冻结传播，三者共同形成可回溯时间轴。
  - 边界处理
    - 对可拖动范围做硬限制，防止时间偏移超出系统支持窗口。
    - 快速切换倍率时保持状态原子更新，避免 UI 与传播结果短暂错位。

- `src/components/3d/MMDViewer.tsx`
  - 技术应用
    - `Three.js`：模型、骨骼、相机与渲染循环基础。
    - `MMD runtime`：模型加载、动作播放、物理/IK 联动。
    - `动态导入`：只在需要时加载重型运行时资源。
  - 在该组件中的具体用法
    - 接收外部“模型/动作选择”并转换为可播放的 MMD 场景对象。
    - 管理角色姿态刷新、动作切换、镜头构图，保证角色展示稳定且可控。
    - 对上层页面只暴露配置输入，内部吸收 MMD 解析和物理复杂度。
  - 性能与稳定性
    - 通过延迟加载降低非 Profile 场景首屏负担。
    - 切换动作时采用受控更新流程，避免骨骼状态残留导致姿势异常。

### 6.4 `components/charts`

- `src/components/charts/SDGRadarChart.tsx`
  - 技术应用
    - `D3 scales`：把 0-100 分数映射到极坐标半径。
    - `D3 path generation`：生成网格环、轴线和多边形轮廓。
    - `React 状态驱动渲染`：根据传入区域集合动态重绘图层。
  - 在该组件中的具体用法
    - 将 SDG 多维指标投影到同一极坐标体系，允许“同一张图”观察结构短板。
    - 在比较模式下叠加多个区域多边形，通过透明度与描边避免遮挡信息丢失。
    - 使用统一维度顺序，保证不同时间/区域比较时图形语义一致。
  - 边界与可读性
    - 分数缺失时做安全兜底，避免 path 断裂导致整图异常。
    - 标签位置与半径留白经过约束，减少文本压线和重叠。

- `src/components/charts/SDGTrendChart.tsx`
  - 技术应用
    - `D3 time/linear scales`：映射年份与分数坐标。
    - `D3 axis`：生成刻度与基准线。
    - `D3 line generator`：把离散年度数据转换为连续趋势线。
  - 在该组件中的具体用法
    - 展示单 SDG 在时间维度的变化轨迹，强调方向和波动幅度。
    - 通过节点高亮和 hover 信息显示关键年份值，避免只看曲线形状猜数据。
    - 与上层筛选状态联动，在切换地区/SDG 时重算坐标域而非硬编码固定轴。
  - 边界与稳定性
    - 对年份不连续数据做有损容忍，保持曲线可绘制且刻度可读。
    - 统一最小宽高约束，避免小容器下坐标文本挤压崩坏。

- `src/components/charts/SDGForecastChart.tsx`
  - 技术应用
    - `D3 line`：绘制模型预测主轨迹。
    - `D3 area`：绘制上下界之间的置信区间带。
    - `React 数据分层渲染`：历史段、预测段、区间带分层展示。
  - 在该组件中的具体用法
    - 将预测值与不确定区间同时呈现，避免把预测当成确定结论。
    - 通过颜色和透明度区分“已观测历史”和“模型外推”，防止语义混淆。
    - 与预测模型输出结构一一对应，支持更换模型而不改图层协议。
  - 边界与稳定性
    - 当区间上/下界异常重叠或缺失时自动降级为主线展示，保证图不空白。
    - 轴域依据数据自动扩展，避免区间带被裁切。

- `src/components/charts/SentimentGraph.tsx`
  - 技术应用
    - `D3 多序列映射`：支持“支持率/反对率”双曲线同轴绘制。
    - `D3 axis + scale`：统一时间轴与比例轴。
    - `交互层`：hover 点与提示信息联动。
  - 在该组件中的具体用法
    - 把社区倾向拆成两条时间曲线，避免“单净值”掩盖结构信息。
    - 支持时间点悬停读取具体值，便于定位某天的情绪突变来源。
    - 与社区投票模块共享数据口径，保证图表与列表统计一致。
  - 性能与可维护性
    - 使用数据驱动重绘，避免在动画中频繁操作 DOM 节点。
    - 双序列配置化，后续新增第三序列可沿用同一渲染管线。

### 6.5 `components/sdg`

- `src/components/sdg/SDGDashboard.tsx`
  - 技术应用
    - `React 状态编排`：管理区域、指标、比较模式、选中 SDG、加载态等多维 UI 状态。
    - `Zustand`：读取全局区域选择和跨页面可复用偏好。
    - `图表组件组合`：聚合雷达图、趋势图、预测图、对比表。
    - `异步数据流`：连接指标 API 与本地分析引擎输出。
  - 在该组件中的具体用法
    - 以“区域 -> 指标数据 -> 评分结果 -> 多视图渲染”作为主数据链路，把原始数据转成可读分析面板。
    - 控制比较模式开关时，自动切换数据组织方式（单区域摘要 vs 多区域并排）。
    - 将问答入口嵌入分析流中，形成“看数据 -> 学知识 -> 得反馈”的闭环。
  - 边界与稳定性
    - API 请求失败时保持局部模块可用，避免整页失效。
    - 对缺失指标做容错显示，保证图表和卡片结构不崩。

- `src/components/sdg/SDGComparisonTable.tsx`
  - 技术应用
    - `分组渲染`：按 SDG 维度组织多区域对比行。
    - `比例条可视`：将分数映射为可视长度，降低纯数字比较成本。
    - `React memo 化渲染`：减少切换区域时的重复计算。
  - 在该组件中的具体用法
    - 在单表中并排展示多区域同项指标，用户无需切换图表即可做横向判断。
    - 使用统一色彩/排序规则保证不同区域之间可直接对齐阅读。
  - 边界与可读性
    - 当区域数量增加时保持列宽和字体层级稳定，避免表格拥挤失真。
    - 对异常值或缺失值显示占位，防止错位对齐。

- `src/components/sdg/SDGQuizModal.tsx`
  - 技术应用
    - `模态状态机`：管理题目流转、作答状态、提交状态、结果状态。
    - `API 提交流程`：提交答题结果并接收奖励/限制反馈。
    - `本地交互反馈`：即时高亮选项、解释文本与分数变化。
  - 在该组件中的具体用法
    - 将“抽题 -> 选择答案 -> 校验 -> 下一题 -> 提交”串成完整流程，避免页面状态跳变混乱。
    - 在提交后展示奖励和剩余次数，让用户明确下一步可操作性。
  - 边界与稳定性
    - 网络失败时保留当前作答上下文，避免用户重复作答。
    - 对非法题目结构或空题集做安全降级提示。

- `src/components/sdg/SDGIcon.tsx`
  - 技术应用
    - `图标语义规范化`：SDG 编号到颜色/图标映射的统一入口。
    - `轻量展示组件`：仅承载语义视觉，不耦合业务逻辑。
  - 在该组件中的具体用法
    - 在 dashboard、comparison、quiz、card 等场景使用同一视觉标识，保证用户跨视图识别一致。
  - 工程价值
    - 后续替换 SDG 视觉资源时只需改一处映射，避免全站散改。

### 6.6 `components/science`

- `src/components/science/ScienceLab.tsx`
  - 技术应用
    - `React 状态编排`：管理查询词、分类过滤、排序、分页/展示模式、加载态与错误态。
    - `Web Speech API`：将语音输入转写为检索关键词并回填查询状态。
    - `Zustand`：复用内容投票状态与用户投票行为，和社区模块保持一致口径。
    - `异步数据流`：聚合文章与论文接口返回，再执行本地二次筛选。
  - 在该组件中的具体用法
    - 将“文章源 + 论文源”统一成同一前端展示模型，解决来源字段不一致问题。
    - 在本地执行关键词检索、标签匹配和排序，减少每次交互都触发网络请求。
    - 支持 URL 查询参数驱动（例如带 `?q=` 进入页面时自动预填并触发结果筛选），便于从 Dashboard 跳转联动。
    - 通过投票按钮与全局投票状态同步，保证同一内容在不同页面显示同一支持/反对结果。
  - 容错设计
    - 当任一数据源请求失败时保留另一数据源结果，避免“全有或全无”。
    - 接口超时或空数据时显示可解释占位态，防止用户误以为系统无响应。
    - 语音识别不可用时自动降级为文本输入，不阻断核心检索流程。
  - 性能与可维护性
    - 对筛选结果使用派生计算与记忆化，避免无关状态变化导致大列表重复重算。
    - 内容卡渲染结构统一，后续新增来源（例如新论文源）可通过数据映射层接入，而无需重写 UI。

### 6.7 `components/community`

- `src/components/community/CommunityHub.tsx`
  - 技术应用
    - `React tab state`：管理 Passes / Posts / Sentiment 三个视图切换。
    - `Zustand stores`：接入帖子、投票、用户状态等跨模块共享数据。
    - `路由联动`：与其它页面（如 Science、Tracking）形成跳转闭环。
  - 在该组件中的具体用法
    - 把三类数据密集视图统一在一个入口，用户可在同一上下文中完成浏览、讨论与态度表达。
    - 在 tab 切换时保留必要状态（筛选词、局部滚动、展开项），避免来回切换丢上下文。
  - 工程价值
    - 降低社区功能分散在多个页面带来的维护复杂度和认知成本。

- `src/components/community/PostsList.tsx`
  - 技术应用
    - `store 驱动列表更新`：列表数据、加载态、错误态从 `postsStore` 统一读取。
    - `增量刷新策略`：新增/编辑/删除后进行局部更新而非整页重拉。
  - 在该组件中的具体用法
    - 管理帖子首屏加载、刷新、空态提示和结果数量变化反馈。
    - 将单条帖子交互（投票、评论入口、编辑入口）下放给 `PostCard`，保持列表层职责单一。
  - 性能与稳定性
    - 避免在每个交互后全列表重建，减少无效渲染抖动。

- `src/components/community/PostCard.tsx`
  - 技术应用
    - `组合式组件架构`：卡片本体 + 投票模块 + 评论模块 + 用户信息模块。
    - `乐观交互反馈`：投票后即时更新计数和按钮状态。
  - 在该组件中的具体用法
    - 在单帖级别聚合标题、正文、标签、作者、投票和评论入口，形成完整交互单元。
    - 支持从卡片直接进入评论上下文，减少跳转层级。
  - 边界处理
    - 对超长文本和缺失字段进行截断/占位，保证列表布局稳定。

- `src/components/community/PostEditor.tsx`
  - 技术应用
    - `受控表单`：输入值和校验状态完全受 React 控制。
    - `异步提交`：创建/编辑请求提交与返回状态驱动 UI。
  - 在该组件中的具体用法
    - 统一处理发帖和改帖两种模式，减少两套表单逻辑分叉。
    - 提交中锁定按钮并显示状态，防止重复提交。
  - 容错设计
    - 服务端校验失败时保留用户输入并显示错误，不清空表单内容。

- `src/components/community/CommentSection.tsx`
  - 技术应用
    - `CRUD 流程状态管理`：评论的创建、编辑、删除与投票状态统一管理。
    - `权限感知渲染`：根据登录态和作者身份决定可操作项。
  - 在该组件中的具体用法
    - 在单帖下组织评论生命周期：输入、提交、更新、删除、计数同步。
    - 对评论投票采用局部更新，避免影响整个帖子列表刷新。
  - 边界与稳定性
    - 评论提交失败时回滚局部状态并给出可恢复反馈。
    - 避免并发编辑导致的显示错位，通过当前编辑目标唯一标识控制状态。

- `src/components/community/UserHoverCard.tsx`
  - 技术应用
    - `预取缓存`：批量加载并缓存基础用户资料。
    - `悬浮层`：按需展示用户等级、奖章、基础统计等概要信息。
  - 在该组件中的具体用法
    - 鼠标悬停时直接读取缓存，减少即时网络请求带来的卡顿和闪烁。
    - 在作者名出现频繁的列表场景中，显著降低重复请求次数。
  - 工程价值
    - 通过“前置缓存 + 懒显示”平衡了信息丰富度和交互流畅度。

### 6.8 `components/climate`

- `src/components/climate/ClimateMonitor.tsx`
  - 技术应用
    - `父层状态编排`：集中管理事件数据、hover 目标、选中目标与详情弹层状态。
    - `组件组合`：将地图、列表、图表、矩阵拆分为可独立维护的子模块。
    - `异步数据加载`：统一处理加载、空态和错误态。
  - 在该组件中的具体用法
    - 作为气候模块 orchestrator，把同一事件状态同步给地图高亮、列表焦点和详情弹窗。
    - 定义模块级“当前数据上下文”，避免各子组件各算一套筛选结果导致口径不一致。
  - 工程价值
    - 保证跨视图联动一致性，并降低子组件之间的耦合依赖。

- `src/components/climate/ClimateMap.tsx`
  - 技术应用
    - `D3 geo projection`：将经纬度投影到二维坐标。
    - `D3 path/render`：绘制地图轮廓与事件点位。
    - `交互桥接`：将 hover/click 事件回传父层状态。
  - 在该组件中的具体用法
    - 将事件空间分布可视化，并支持鼠标悬停预览与点击选中。
    - 接收父层传入的选中 ID 进行反向高亮，实现双向联动（列表选中 -> 地图同步）。
  - 边界与可读性
    - 对重叠点位通过视觉分层降低遮挡，避免热点区域不可读。
    - 对缩放和尺寸变化做最小点击区域保护，保证交互可用。

- `src/components/climate/EventCard.tsx`
  - 技术应用
    - `列表卡片呈现`：结构化摘要展示。
    - `状态反馈样式`：hover/active 区分。
  - 在该组件中的具体用法
    - 承载单事件的关键信息（等级、来源、区域、时间）与详情入口。
    - 通过选中状态与父层保持同步，形成“列表点选 -> 全局联动”路径。
  - 工程价值
    - 提升高密度事件场景下的扫描效率，减少频繁打开详情的成本。

- `src/components/climate/EventDetailModal.tsx`
  - 技术应用
    - `模态层`：隔离详情阅读上下文。
    - `条件渲染`：仅在有选中事件时挂载。
  - 在该组件中的具体用法
    - 展示单事件完整字段、上下文说明与来源信息，承接地图和列表的深度阅读。
    - 关闭时回写父层状态，恢复主界面焦点和交互流。
  - 边界处理
    - 对缺失字段提供占位与降级展示，防止布局断裂。

- `src/components/climate/ClimatePulseChart.tsx`
  - 技术应用
    - `时间序列图形表达`：事件强度/数量的时间维映射。
    - `比例尺与插值`：保持趋势曲线连续可读。
  - 在该组件中的具体用法
    - 展示“何时升高、何时回落”的节奏变化，补足地图的时间信息缺失。
    - 与当前筛选结果联动，确保曲线反映的是当前上下文而非全量混合值。
  - 稳定性
    - 对稀疏时间点做平滑兜底，避免断线误导。

- `src/components/climate/RegionalBreakdown.tsx`
  - 技术应用
    - `区域聚合统计`：按地理区域汇总数量与风险权重。
    - `排序展示`：按风险或数量排序突出优先级。
  - 在该组件中的具体用法
    - 将空间分布转为结构化排行，帮助快速比较区域压力差异。
    - 与地图状态联动，支撑“区域视角”和“地理视角”互相校验。
  - 工程价值
    - 把地图上的“视觉直觉”转化为可比较的统计结果。

- `src/components/climate/SourceFlowChart.tsx`
  - 技术应用
    - `关系流向可视化`：来源、类型、影响路径关系表达。
    - `连线编码`：线宽/色阶映射关系强度。
  - 在该组件中的具体用法
    - 展示“哪些来源更常触发哪些类型风险”，帮助判断信息来源结构。
    - 与筛选条件同步，只呈现当前上下文的流向关系，避免全量噪声。
  - 边界与可读性
    - 关系过多时优先主路径，弱化长尾，避免图形拥堵不可读。

- `src/components/climate/ThreatMatrix.tsx`
  - 技术应用
    - `风险矩阵映射`：将事件映射到“频率 × 影响”二维空间。
    - `阈值分区`：通过背景分区表达风险等级边界。
  - 在该组件中的具体用法
    - 让用户快速锁定“高频高影响”象限，形成行动优先级。
    - 与事件列表联动，矩阵结果可回指到具体事件集合。
  - 工程价值
    - 将复杂事件流压缩为可执行的风险优先级视图。

### 6.9 `components/ground`

- `src/components/ground/GroundNetwork.tsx`
  - 技术应用
    - `复合页面编排`：统一调度地图、站点详情、覆盖分析、数据流图。
    - `共享状态管理`：在父层维护当前选中站点和高亮链路上下文。
    - `异步数据准备`：集中处理站点/链路数据加载、空态和错误态。
  - 在该组件中的具体用法
    - 作为 ground 模块总控，将“空间位置、网络覆盖、数据路径”三种视角绑定到同一数据上下文。
    - 当用户选中某站点时，同步驱动地图聚焦、详情面板更新和链路图高亮。
  - 工程价值
    - 防止多个子图各自维护选中状态导致显示不一致。

- `src/components/ground/StationMap.tsx`
  - 技术应用
    - `地图可视化`：站点坐标到屏幕坐标映射与图层渲染。
    - `交互事件桥接`：hover/click 事件回传父层。
    - `视觉编码`：用颜色/大小区分站点类型与状态。
  - 在该组件中的具体用法
    - 展示地面站空间分布，并支持点击选中与焦点定位。
    - 与详情面板联动，选中站点后立即展示该站点链路和参数。
  - 边界与可读性
    - 近邻站点重叠时使用视觉层级避免点位遮挡。
    - 视窗变化时保持站点可点击范围不失效。

- `src/components/ground/StationCard.tsx`
  - 技术应用
    - `详情面板呈现`：结构化展示站点属性和关键链路信息。
    - `条件渲染`：仅在存在选中站点时挂载详细信息。
  - 在该组件中的具体用法
    - 展示站点基础参数、连接数量、关键链路摘要和当前状态标签。
    - 作为“地图点位”的语义补充层，避免用户只看到位置而看不到意义。
  - 边界处理
    - 字段缺失时使用占位展示，保证卡片结构稳定不塌陷。

- `src/components/ground/CoverageAnalysis.tsx`
  - 技术应用
    - `几何覆盖表达`：把站点与链路能力转换为覆盖范围可视化结果。
    - `聚合统计`：生成覆盖率、盲区、冗余区等指标。
  - 在该组件中的具体用法
    - 从站点分布出发计算“可覆盖区域”与“低覆盖区域”，输出给用户用于网络评估。
    - 与选中站点上下文联动，可观察局部站点调整对整体覆盖的影响。
  - 工程价值
    - 将“看地图”升级为“看网络质量”，支持运维决策。

- `src/components/ground/DataFlowDiagram.tsx`
  - 技术应用
    - `拓扑图可视化`：将站点与链路关系绘制为节点-边网络。
    - `路径高亮`：根据当前选中站点突出相关数据流路径。
    - `关系布局`：通过层次/力导向策略减少连线交叉噪声。
  - 在该组件中的具体用法
    - 呈现“数据从哪里来、经过哪些站点、到哪里去”的路径结构。
    - 当用户从地图选择某站点时，该图同步强调与该站点相关的上游/下游链路。
  - 边界与可读性
    - 节点和连线过多时优先显示关键路径，弱化长尾连接，避免图面拥堵。

### 6.10 页面级组件

- `src/components/about/AboutView.tsx`
  - 技术应用
    - `Framer Motion`：分段入场、标题与装饰 SVG 的连续动画编排。
    - `ScrollReveal` 组合件：统一分段 reveal 节奏和计数器动画。
    - `CSS Variables + Tailwind`：大段叙事内容在品牌主题下保持统一排版与配色。
  - 在该组件中的具体用法
    - 通过“卫星贡献、数据流水线、任务来源、影响指标”四类数据块，把叙事内容转换为结构化可扫描信息。
    - 使用 `AnimatedCounter` 和分段引导，避免长篇文本造成阅读疲劳。
    - 大量视觉元素（轨道、扫描线、色条）采用声明式动画，不依赖额外状态机。
  - 工程价值
    - 把原本静态 About 页面升级为“可读可视”的品牌叙事层，兼顾信息密度和可读性。

- `src/components/history/HistoryView.tsx`
  - 技术应用
    - `React useState`：管理交互式模块（如 SSR 评分模块）的激活状态。
    - `Framer Motion + AnimatePresence`：时间线节点、详情展开与切换动画。
    - `SVG 几何布局`：在前端直接计算“卫星任务到 SDG 目标”的连接示意图。
  - 在该组件中的具体用法
    - 将航天里程碑按时间轴排序，并用统一的图标语义和颜色体系建立年代分层。
    - 通过连接图把抽象的“任务-目标关系”转成可视化拓扑，用户可直接读出耦合关系。
    - 使用激活态切换来展示 SSR 各模块细节，减少一次性信息灌入。
  - 工程价值
    - 兼顾“线性历史叙事”和“关系网络解释”，不是单纯的静态时间线。

- `src/components/tech/TechView.tsx`
  - 技术应用
    - `Framer Motion + useInView`：进入视口后触发分区动画，减少首屏一次性开销。
    - `SVG 程序化绘制`：通过节点/边数据和几何函数生成技术星座图与线框球。
    - `数据驱动渲染`：技术栈、架构层、数据库表均由常量表映射生成。
  - 在该组件中的具体用法
    - 使用节点坐标与边关系绘制“技术依赖星座”，可直观看出前后端和算法层耦合点。
    - `generateWireframeSphere` 等几何函数将视觉图元从硬编码路径中抽离，便于后续拓展样式。
    - 架构层和技术卡片通过统一映射渲染，新增技术项只改数据不改结构。
  - 工程价值
    - 页面本身既是文档也是可运行示例，展示“数据驱动 + 可视化优先”的工程风格。

- `src/components/aurora/AuroraView.tsx`
  - 技术应用
    - `Canvas 2D + requestAnimationFrame`：高频生成式视觉循环。
    - `噪声函数（hash/noise/fbm）`：构造连续变化的纹理与流动效果。
    - `React hooks`：通过 `useRef/useEffect/useCallback` 管理画布、交互与动画生命周期。
  - 在该组件中的具体用法
    - 将“丝带绘制、粒子、余辉、暗角”拆为独立绘制 pass，形成层次化视觉结果。
    - 以手势输入驱动轨迹生成，并在释放后继续进行物理扰动和衰减，而非静态涂抹。
    - 使用 in-view 触发与销毁逻辑，避免页面不可见时继续占用渲染资源。
  - 性能边界
    - 通过帧循环内对象复用和数量上限，控制粒子类效果的内存与 CPU 波动。

- `src/components/profile/ProfileView.tsx`
  - 技术应用
    - `Next dynamic import`：`MMDViewer` 客户端按需加载，避免 SSR 阶段不兼容问题。
    - `Zustand` 多 store 协同：认证、应用偏好、投票、积分等状态聚合。
    - `React useMemo/useEffect/useCallback`：奖章计算、数据同步、乐观更新控制。
  - 在该组件中的具体用法
    - 在登录后并发拉取积分与动作数据，并在页面内聚合成“等级/奖章/追踪成就”完整视图。
    - 奖章装备采用乐观更新 + 失败回滚，保证交互响应与一致性兼顾。
    - 使用数据就绪条件控制 `sync-medals` 触发时机，避免早期重复同步。
  - 工程价值
    - 将“成长系统、收藏系统、角色系统”整合为单一用户中心，减少跨页面状态割裂。

- `src/components/auth/AuthModal.tsx`
  - 技术应用
    - `受控表单`：登录/注册双模式共用输入状态与校验策略。
    - `Zustand authStore`：统一调用 `login/register`、错误态与 loading 态。
    - `Framer Motion + AnimatePresence`：遮罩、弹窗、注册字段过渡动画。
  - 在该组件中的具体用法
    - 切换模式时同步清理错误态，避免旧错误残留到新流程。
    - 提交后通过 `authStore` 最新状态判断是否成功关闭窗口，而不是仅依赖请求 resolve。
    - 模态层与背景分离动画，保证关闭动作的视觉完整性和可理解性。
  - 边界处理
    - 异步错误在表单内联展示，避免用户在全局通知中丢失上下文。

- `src/components/admin/AdminDashboard.tsx`
  - 技术应用
    - `React state + effect`：用户/帖子/评论三标签页数据拉取与视图切换。
    - `Framer Motion`：管理页局部展开、下拉与状态切换动画。
    - `权限上下文`：依赖 `authStore` 的角色信息控制管理能力。
  - 在该组件中的具体用法
    - 使用统一管理面板承载用户角色变更、内容审查、基础审计信息浏览。
    - 自定义角色下拉组件（`FormRoleSelect`）将权限操作语义化，降低误操作概率。
    - 列表操作后回刷当前标签数据，确保后台状态和展示同步。
  - 工程价值
    - 把分散的管理动作集中到同一工作台，支持日常运维和内容治理闭环。

### 6.11 `components/game`（per 文件技术应用）

- `src/components/game/engine/GameCanvas.tsx`
  - 技术应用
    - `React + useRef`：把游戏运行时对象（`GameState`、`GameLoop`、`Input`、`Camera`）与 React 渲染解耦。
    - `Canvas API`：显式控制 CSS 像素与内部分辨率一一对应，避免缩放模糊。
    - `Wake Lock API`：在游戏运行时请求屏幕常亮，减少设备降频与息屏中断。
  - 在该组件中的具体用法
    - 将 UI 层 `gameAction` 映射到引擎动作（start/choose/reroll/resume/restart），形成单向命令通道。
    - 统一承接 `onStatsUpdate/onLevelUp/onGameOver/onIntelFragment` 回调，把引擎状态同步给 HUD 与弹窗。
    - 在初始化阶段串起 `Input -> Camera -> createGame -> GameLoop`，并在卸载时完整释放监听与锁。
  - 工程价值
    - 使 React 只负责“控制面”和“展示面”，游戏主循环保持独立、稳定、可复用。

- `src/components/game/engine/GameLoop.ts`
  - 技术应用
    - `Fixed timestep`：逻辑更新固定步长，渲染用插值系数 `alpha`。
    - `requestAnimationFrame`：与浏览器刷新节奏对齐。
    - `FPS 采样`：在循环内统计实时帧率。
  - 在该组件中的具体用法
    - 对超大 `delta` 做上限裁剪，避免标签切换后出现“螺旋死亡”。
    - `while (accumulator >= TICK_MS)` 保障逻辑帧确定性，渲染层只做视觉补间。
  - 工程价值
    - 提升战斗判定与刷新节奏的一致性，降低机器性能差异导致的平衡漂移。

- `src/components/game/engine/Input.ts`
  - 技术应用
    - `事件采样层`：统一捕获键鼠输入并暴露轮询状态。
    - `focus/blur 容错`：窗口失焦时清空输入状态，避免“卡键”。
  - 在该组件中的具体用法
    - 鼠标事件绑定在 `window` 而不是 `canvas`，保证覆盖 UI 弹层时输入仍连续。
    - 提供 `pause` 语义字段（P/Escape）供 `GameState` 直接消费。
  - 工程价值
    - 将输入语义标准化，避免每个系统重复处理浏览器事件细节。

- `src/components/game/engine/Camera.ts`
  - 技术应用
    - `Lerp 跟随`：相机平滑追踪玩家，抑制镜头抖动。
    - `Shake 模型`：受击或爆炸时叠加短时屏幕震动。
    - `坐标变换`：屏幕坐标与世界坐标双向映射。
  - 在该组件中的具体用法
    - 渲染层统一使用 `screenX/screenY` 投影，交互层使用 `worldX/worldY` 做鼠标瞄准。
    - 提供 `isVisible` 与视口边界，支持实体可见性裁剪与离屏回收逻辑。
  - 工程价值
    - 把空间映射和镜头反馈集中管理，减少渲染/碰撞系统重复换算。

- `src/components/game/engine/ObjectPool.ts`
  - 技术应用
    - `对象池复用`：通过 `active` 标记复用实体实例。
    - `firstFree hint`：记录空闲起点，减少线性扫描成本。
  - 在该组件中的具体用法
    - 子弹、敌人、掉落物都基于同一池化模板，统一 `acquire/release/forEach` 生命周期。
    - 提供 `releaseAll` 用于 `reset` 场景，确保重开时状态干净。
  - 工程价值
    - 显著降低 GC 抖动，保证高密度刷怪下的帧稳定。

- `src/components/game/engine/SpatialHash.ts`
  - 技术应用
    - `Spatial Hash`：按网格桶存储实体，碰撞前先做邻域筛选。
    - `Cantor Pairing`：将二维 cell 坐标稳定映射为单 key。
  - 在该组件中的具体用法
    - 每帧重建敌人索引，子弹碰撞仅查询局部半径而非全表扫描。
    - `query` 使用去重集合避免多单元覆盖导致重复判定。
  - 工程价值
    - 将常态碰撞复杂度从近似 O(N\*M) 降到可控区间。

- `src/components/game/engine/PRNG.ts`
  - 技术应用
    - `Mulberry32` 伪随机算法。
    - 全局可重置种子，支持 deterministic 复现。
  - 在该组件中的具体用法
    - 被星空生成、形状生成等程序化渲染复用，确保“同 seed 同结果”。
  - 工程价值
    - 便于平衡测试和视觉回归定位。

- `src/components/game/entities/Player.ts`
  - 技术应用
    - `玩家状态模型`：船体档案、成长属性、武器/被动、融合强制激活统一管理。
    - `伤害保护阈值机制`：短窗累计伤害达阈值触发无敌帧，阈值随时间抬升。
    - `物理移动模型`：推力、阻尼、最大速度插值、鼠标距离调速。
  - 在该组件中的具体用法
    - 通过 `ShipHullProfile` 做三船体差异化（生命/速度/冷却/伤害/护甲/AOE）。
    - `damagePlayer` 在扣血同时更新短窗累计与阈值判定，直接驱动 HUD 护盾条表现。
    - `recalcPlayerStats`（配合升级系统）在被动变化后重算派生属性。
  - 工程价值
    - 将“操作手感”和“成长数值”放在统一数学模型中，便于平衡迭代。

- `src/components/game/entities/Enemy.ts`
  - 技术应用
    - `实例模板 + 初始化器`：统一敌人实体创建与字段重置。
    - `行为分支`：追踪、固定方向冲刺、射击冷却、分裂参数等共存。
    - `轨迹记录`：保存短历史轨迹，支持 Temporal Anchor 回溯。
  - 在该组件中的具体用法
    - `updateEnemy` 内聚移动、眩晕、回溯、射击计时等基础行为。
    - `trail` 环形历史用于“回退到两秒前位置”效果，不依赖外部系统再采样。
  - 工程价值
    - 保持敌人行为可配置扩展，同时避免每种敌人写独立类导致维护碎片化。

- `src/components/game/entities/Boss.ts`
  - 技术应用
    - `阶段配置表`：按血量阈值切换炮塔数、射速、召唤配置。
    - `几何生成`：按角度等分生成炮塔射击点位。
  - 在该组件中的具体用法
    - `getBossPhaseConfig` 直接被 `GameState` 调用，实现 boss 生命周期中的强度爬坡。
  - 工程价值
    - 让 Boss 难度调优集中在配置层完成，减少逻辑代码频繁改动。

- `src/components/game/entities/Bullet.ts`
  - 技术应用
    - `统一弹体模型`：同一数据结构承载子弹、激光、环形场、回旋体等多形态。
    - `行为状态字段`：返回段 easing、分裂、反弹、锁定、碰撞延迟等。
    - `逐帧更新`：在实体层处理 boomerang/harpoon/gravity/anchor 等专属运动学。
  - 在该组件中的具体用法
    - 回旋/鱼叉通过 `returnEaseFrames + cos` 做“出程到回程”平滑速度翻转。
    - 激光/棱镜保存 `targetId/endX/endY/prismBranches`，供碰撞与渲染共同消费。
  - 工程价值
    - 避免“每武器一个实体类型”造成复杂爆炸，支持快速技能实验。

- `src/components/game/entities/Pickup.ts`
  - 技术应用
    - `掉落生命周期模型`：散射、吸附、拾取、超时销毁。
    - `磁吸逻辑`：进入拾取半径后切换追踪玩家。
  - 在该组件中的具体用法
    - XP/HP/碎片三类掉落共享同一状态机与更新函数。
  - 工程价值
    - 保持掉落反馈一致，减少不同掉落类型行为偏差。

- `src/components/game/systems/GameState.ts`
  - 技术应用
    - `系统编排器`：统一调度 Player/Weapon/Wave/Collision/Particle/Render。
    - `Canvas 上下文优化`：优先 `alpha: false`、`desynchronized: true` 降低渲染开销。
    - `多路事件回调`：把引擎事件拆分为 game over、升级、HUD、碎片奖励等。
  - 在该组件中的具体用法
    - 在单帧内定义固定顺序：输入与玩家更新 -> 刷怪 -> 武器 -> 子弹/敌人 -> 碰撞 -> 粒子 -> 升级与统计广播 -> 渲染。
    - 包含激光持续锁定、Prism 多衍射线、Aegis 运行时更新等跨系统桥接逻辑。
    - `stats` 以节流方式（约 10fps）推送给 UI，减少 React 频繁重渲染。
  - 工程价值
    - 作为引擎“主时钟”，保证功能扩展时仍保持可预测的执行顺序。

- `src/components/game/systems/WaveManager.ts`
  - 技术应用
    - `预算驱动刷怪`：常态波次按预算值和目标密度逐步投放。
    - `敌潮机制`：独立总预算 + roster 编排，周期性进入高压窗口。
    - `时长曲线`：目标活跃敌人数、预算、敌机上限、射手上限均随时间增长。
  - 在该组件中的具体用法
    - 常态期控制“陨石:敌机”倾向与射手占比，避免弹幕型难度失控。
    - 敌潮期允许少量类型集中刷新，并按 `cost` 自动换算刷怪数量。
    - 定时触发 Boss，并在长局中提高敌潮频率、缩短间隔。
  - 工程价值
    - 难度增长由“场面压力”而非瞬时弹幕峰值主导，更接近幸存者型节奏。

- `src/components/game/systems/WeaponSystem.ts`
  - 技术应用
    - `配置到行为映射`：读取 `getWeaponLevel` 数值并转成实际发射模式。
    - `冷却调度器`：按武器 ID 维护独立 CD，支持持续型/返回型特殊计时。
    - `融合入口`：激活融合后接入额外发射或被动效果（如 Aegis runtime）。
  - 在该组件中的具体用法
    - Boomerang/Harpoon/Pursuit Halo 使用“实体消失后再进 CD”的节奏模型。
    - 各类武器（散射、追踪、激光、地雷链路、时空锚、持续场）以专用 fire 方法实现。
    - 每帧计算最近敌人角度作为自动索敌基准，并兼顾手动朝向武器。
  - 工程价值
    - 武器平衡主要在参数层迭代，发射逻辑保持可读、可测、可拆分。

- `src/components/game/systems/CollisionSystem.ts`
  - 技术应用
    - `碰撞与结算中心`：统一处理弹体命中、AOE、接触伤害、拾取、击杀事件。
    - `SpatialHash` 邻域检索：将标准子弹判定限制在局部候选。
    - `武器特化判定`：激光、重力场、时空锚、电网、回旋环、鱼叉拉拽等分支结算。
  - 在该组件中的具体用法
    - 鱼叉仅在回程生效，线接触持续伤害、钩头接触触发安全半径约束下拉拽。
    - 处理 Fission 命中即分裂、Ricochet 反弹、Siege 命中即爆、Prism 分支束持续伤害。
    - 在结算中直接触发粒子、掉落、玩家受击反馈与相机震动。
  - 工程价值
    - 将复杂判定集中到单系统，降低多处改动导致的行为不一致。

- `src/components/game/systems/UpgradeSystem.ts`
  - 技术应用
    - `权重抽样`：按稀有度、已有武器升级优先级、融合缺半加权生成候选。
    - `等级门槛`：按 rarity gate 控制高阶武器出现时机。
    - `reroll 状态机`：每次升级仅允许一次刷新。
  - 在该组件中的具体用法
    - 候选池同时覆盖“已有武器升级、新武器解锁、被动升级”，并做无放回抽样。
    - 基于当前装备计算潜在融合缺口，提高相关技能出现概率。
  - 工程价值
    - 将“成长手感”和“构筑引导”交由可调权重控制，而非硬编码掉落表。

- `src/components/game/systems/ParticleSystem.ts`
  - 技术应用
    - `粒子池化`：固定容量粒子阵列 + nextFree 指针。
    - `模式化发射器`：通用 `emit` + 命名效果（explode/thrust/prismBurst 等）。
    - `屏幕坐标预计算`：更新阶段就计算 `screenX/screenY`，减轻渲染层负担。
  - 在该组件中的具体用法
    - 根据不同武器语义发射不同参数组（速度、寿命、尺寸、角区间）。
    - 所有效果共享同一 update 衰减模型，视觉风格统一。
  - 工程价值
    - 在高特效密度下保持可控性能和统一反馈语言。

- `src/components/game/systems/fusionOrbitals.ts`
  - 技术应用
    - `融合运行时状态`：通过 `WeakMap<PlayerState, Runtime>` 存储每位玩家的节点状态。
    - `弹簧阻尼运动学`：节点从基础轨道向目标平滑偏移，避免瞬移抖动。
    - `唯一目标分配`：多节点索敌时避免重复锁定同一敌人。
  - 在该组件中的具体用法
    - Aegis 固定五节点同半径旋转，锁敌后按预测位置做有上限的 leash 偏转。
    - 维护 `px/py/dir/speed/lockRatio` 供渲染拖尾和碰撞扫掠共同使用。
  - 工程价值
    - 将融合复杂行为封装为独立 runtime，不污染常规武器系统。

- `src/components/game/rendering/Renderer.ts`
  - 技术应用
    - `分层渲染管线`：背景星空 -> 引力场 -> 拾取物 -> 敌人 -> 子弹 -> 玩家 -> 粒子 -> 屏幕效果。
    - `程序化几何绘制`：依赖 `ShapeGenerator` 动态绘制飞船/敌机/陨石/Boss。
    - `视觉特效`：推进尾流、护盾泡、激光与脉冲场等多样化 Canvas 效果。
  - 在该组件中的具体用法
    - 玩家推进尾焰使用轨迹 ring buffer 生成渐变丝带，而非简单直线拖尾。
    - Temporal Anchor/Aegis/Prism 等高级技能效果在此实现高亮、扫描、辉光语言。
    - 通过 `camera.isVisible` 裁剪离屏对象，减少无效绘制。
  - 工程价值
    - 在纯 2D Canvas 下实现高辨识度战斗视觉，并保持层次清晰可维护。

- `src/components/game/rendering/Effects.ts`
  - 技术应用
    - `屏幕级后效`：闪白、暗角、扫描线统一管理。
    - `受击脉冲`：受击时放大暗角并触发闪红。
  - 在该组件中的具体用法
    - `Renderer` 每帧末尾叠加效果，战斗反馈不会侵入实体绘制逻辑。
  - 工程价值
    - 将全屏反馈集中化，方便统一调校“冲击感”。

- `src/components/game/rendering/StarField.ts`
  - 技术应用
    - `无限视差星空`：分层 parallax + 按 cell 程序化生成星点。
    - `seeded PRNG`：同一网格坐标可复现相同星点布局。
    - `缓存策略`：按 cell key 缓存并定期淘汰，控制内存增长。
  - 在该组件中的具体用法
    - 相机移动时无需生成实体对象，仅按视口重采样相邻网格实现“无限空间感”。
  - 工程价值
    - 以低成本提供稳定的空间运动背景，避免纹理大图与对象管理负担。

- `src/components/game/rendering/ShapeGenerator.ts`
  - 技术应用
    - `程序化线稿生成`：飞船、敌机、陨石等均由几何点集动态生成。
    - `seed 抖动`：对特定形状加入可复现随机扰动，提升多样性。
    - `多船体设计`：viper/mantis/titan 各有独立 hull/detail/engine 配置。
  - 在该组件中的具体用法
    - 渲染器以统一 `drawShape/drawCircle/drawLine` 调用这些点集，复用绘制通道。
  - 工程价值
    - 极大减少静态贴图依赖，让视觉迭代更快、资源包更轻。

- `src/components/game/ui/GameStartScreen.tsx`
  - 技术应用
    - `Framer Motion`：主菜单分区动效、解锁浮窗、过渡反馈。
    - `状态编排`：飞船选择、初始技能滚轮、融合测试入口、情报解密流程。
    - `数据映射 UI`：从武器/融合定义与知识库映射生成可视卡片与详情浮层。
  - 在该组件中的具体用法
    - 技能滚轮实现循环列表与连续切换动画，避免技能数量增长导致布局溢出。
    - 解密奖励根据稀有度触发限时视觉浮窗，并与账户点数/碎片状态联动。
  - 工程价值
    - 把“测试入口”和“正式开局流程”整合在同一可扩展菜单框架内。

- `src/components/game/ui/UpgradeModal.tsx`
  - 技术应用
    - `升级模态状态机`：显示候选、融合提示、reroll 状态。
    - `稀有度主题系统`：边框、辉光、徽章颜色按 rarity 映射。
    - `融合预判`：根据当前装备 + 候选项推断潜在融合达成路径。
  - 在该组件中的具体用法
    - 统一卡片高度与按钮锚点，避免不同描述长度导致布局跳动。
    - 当 reroll 消耗后即时更新状态标签，保证交互结果可见。
  - 工程价值
    - 提升升级决策信息密度，同时维持战斗节奏中的快速选择体验。

- `src/components/game/ui/GameHUD.tsx`
  - 技术应用
    - `高频 HUD 展示`：实时渲染生命、经验、时间、分数、武器列表、被动与融合状态。
    - `Motion 数值动效`：血条、护盾阈值条、无敌态扫描线等使用动画强化反馈。
    - `稀有度视觉编码`：武器卡按 rarity 使用不同背景与边框。
  - 在该组件中的具体用法
    - “Impact Buffer” 可视化直接对接玩家伤害累计阈值机制，展示无敌触发进度。
    - 左侧列布局在信息密集场景下保持可滚动，不遮挡核心战斗区域。
  - 工程价值
    - 将复杂战斗状态转成可读 UI，帮助玩家做即时构筑与走位决策。

- `src/components/game/ui/PauseMenu.tsx`
  - 技术应用
    - `模态叠层 + 动画过渡`：暂停时冻结战斗并展示状态摘要。
    - `结构化统计卡片`：时间、分数、等级、击杀、碎片、装备一屏聚合。
  - 在该组件中的具体用法
    - 支持键盘恢复（P/Esc）与按钮恢复/退出双路径。
  - 工程价值
    - 在不中断上下文的前提下提供“短暂停顿与复盘”能力。

- `src/components/game/ui/GameOverScreen.tsx`
  - 技术应用
    - `结算态动效编排`：标题、统计项、排行榜按延迟分层出场。
    - `高分识别`：自动判定新纪录并高亮展示。
  - 在该组件中的具体用法
    - 结算数据按 waterfall 动画逐条显示，强化“局后反馈”节奏。
    - 提供重开与退出双入口，并展示 Top 分数列表用于长期目标驱动。
  - 工程价值
    - 让单局闭环完整，提升重玩意愿与进度感知。

## 7. 核心业务库（`src/lib`）

### 7.1 认证与数据库基础

- `src/lib/prisma.ts`
  - 技术应用
    - `PrismaClient` 生命周期治理（Node 进程级单例）。
    - `globalThis` 挂载策略，适配 Next.js 开发态热更新。
  - 在该模块中的具体机制
    - 通过 `globalForPrisma.prisma ?? new PrismaClient()` 保证模块重复加载时不重复建连。
    - 仅在 `NODE_ENV !== "production"` 时回写到 `globalThis`，生产环境保持标准实例边界。
    - 全站所有 DAO 都从该入口拿 client，避免“每个库文件私自 new PrismaClient”。
  - 工程价值与边界
    - 解决开发态连接膨胀和 SQLite 锁竞争问题。
    - 该层只负责连接与实例生命周期，不承载任何业务查询规则。

- `src/lib/auth/types.ts`
  - 技术应用
    - 认证域模型的 TypeScript 类型约束（`User` / `AuthUser` / `JWTPayload`）。
  - 在该模块中的具体机制
    - `User` 表示数据层完整用户结构（包含 `passwordHash`），用于 DAO 与鉴权验证。
    - `AuthUser` 明确去除敏感字段，只保留会话上下文所需信息，供 API 业务逻辑消费。
    - `JWTPayload` 将 token 最小化为 `userId + email`，避免在 token 中堆放冗余权限与资料。
  - 工程价值与边界
    - 把“可落库字段”“可回传字段”“可入 token 字段”分层，减少敏感信息误泄露。
    - 类型层不做运行时校验，输入合法性仍由 route 层负责。

- `src/lib/auth/jwt.ts`
  - 技术应用
    - `jose` 的 `SignJWT/jwtVerify` 统一封装。
    - `HS256` 对称签名与过期策略集中定义。
  - 在该模块中的具体机制
    - 以 `TextEncoder` 将 `JWT_SECRET` 转为密钥字节；缺省值仅用于开发回退。
    - `signToken` 在单点固定写入 `alg/iat/exp(7d)`，避免各路由自由定义过期时间。
    - `verifyToken` 捕获全部验签异常并返回 `null`，业务层只处理“有效/无效”二值语义。
  - 工程价值与边界
    - 认证令牌策略可集中审计和统一升级，避免分散实现造成策略漂移。
    - 当前为对称密钥方案，密钥轮换与多密钥兼容需要在此层扩展。

- `src/lib/auth/db.ts`
  - 技术应用
    - 用户域 DAO（Data Access Object）抽象。
    - Prisma 结果到认证域类型的显式映射。
  - 在该模块中的具体机制
    - `getUsers/getUserByEmail/getUserById/createUser` 将用户访问路径统一在一处，API route 不再直接拼 Prisma 查询。
    - 所有方法把 `Date` 转成 ISO 字符串，消除前后端时间字段形态不一致。
    - `undefined` 作为“查无此人”语义返回，调用方无需额外判空协议转换。
  - 工程价值与边界
    - 路由层可以专注“鉴权流程、参数校验、HTTP 语义”，数据层只负责持久化细节。
    - 该层不做密码哈希与比对，密码处理被刻意放在 `/api/auth/*` 路由中执行。

- `src/lib/auth/middleware.ts`
  - 技术应用
    - 请求级认证门面（`NextRequest -> AuthUser | null`）。
    - 角色鉴权封装（`requireAdmin`）。
  - 在该模块中的具体机制
    - 从 Cookie `auth-token` 读取令牌，依次执行验签、查库、脱敏映射，任一失败都返回 `null`。
    - `requireAdmin` 复用 `getAuthUser` 并在同一入口做角色断言，减少管理路由重复代码。
    - 多个 API（points、posts、notifications、game starter skills、admin）共享这条认证管线。
  - 工程价值与边界
    - 把认证判定从业务路由中抽离，权限边界一致且便于审计。
    - 此模块返回的是鉴权结果，不直接构造 HTTP 响应；错误码与消息由调用路由决定。

### 7.2 卫星与轨道传播

- `src/lib/satellite/propagator.ts`
  - 技术应用
    - `satellite.js` 的 SGP4/坐标变换能力封装。
    - TLE 文本解析与轨道路径采样工具化。
  - 在该模块中的具体机制
    - `parseTLEText` 按 3 行结构（名称 + line1 + line2）解析，并校验 `1 / 2` 行前缀后再入库。
    - `propagate` 完成 `twoline2satrec -> propagate -> eciToGeodetic` 链路，输出 `lat/lng/alt/velocity` 统一结构。
    - `isVisibleFrom` 将观察站经纬度转弧度后执行 `ecfToLookAngles`，按仰角阈值判定可见性。
    - `generateOrbitPath` 用固定步长采样未来轨道点，为地图/轨迹线渲染提供连续点序列。
    - 所有核心函数都在异常时返回 `null/false`，确保单颗卫星异常不拖垮全局刷新。
  - 工程价值与边界
    - 把复杂轨道数学收敛为稳定 API，前端场景层只消费业务坐标。
    - 该层不做批量并行调度与缓存，性能策略由上层 hook/服务控制。

- `src/lib/satellite/celestrakApi.ts`
  - 技术应用
    - 外部 TLE 源接入（CelesTrak）+ 本地持久化缓存（Prisma `tleCache`）。
    - 多组并发拉取与 TTL 失效策略。
  - 在该模块中的具体机制
    - 维护 `CELESTRAK_GROUPS` 映射（stations/weather/resource/science），并附带本地 `type` 语义。
    - `isCacheFresh` 基于 `fetchedAt` 最新时间与 `CACHE_TTL_MS` 判断是否触发远程刷新。
    - `fetchAndCacheGroup` 使用 `AbortSignal.timeout(15000)` 防止长时间阻塞，并设置 `User-Agent`。
    - 每条 TLE 用 `noradId` 做 `upsert`，避免重复同步造成重复记录或旧数据残留。
    - `getTLEs` 采用“先尝试刷新，失败回退旧缓存”策略，保证外部源故障时服务仍可用。
    - `computeEpochAge` 解析 TLE epoch 字段，提供“轨道元新鲜度”指标供上层质量判断。
  - 工程价值与边界
    - 在外部接口不稳定时维持“尽量新 + 始终可读”的可用性目标。
    - 当前缓存 TTL 为全局统一值，不区分组别刷新频率；更细粒度策略可后续扩展。

- `src/lib/satellite/mockData.ts`
  - 技术应用
    - 离线数据资产与开发模拟器。
    - 固定样例 TLE + 随机碎片场生成。
  - 在该模块中的具体机制
    - `SAMPLE_TLES` 提供覆盖站星/气象/资源等类型的代表性样本，便于无网环境联调。
    - `generateMockSatellites` 从样例生成 `SatelliteData`，自动补齐 `noradId/type/tle1/tle2` 等字段。
    - `SAT_TYPE_MAP` 将部分关键星按业务语义映射到 `station/weather/active`，与真实数据结构保持一致。
    - `generateMockDebris` 批量构造碎片对象（随机轨道高度与速度），用于高密度场景性能测试。
  - 工程价值与边界
    - 保障前端在 API 不可用时仍能演示完整交互链路。
    - 该层是“结构正确”的模拟数据，不保证物理轨道真实分布。

- `src/lib/satellite/usePropagate.ts`
  - 技术应用
    - 客户端轨道重算调度 hook（React + Zustand）。
    - 定时增量更新策略。
  - 在该模块中的具体机制
    - 用 `setInterval` 周期执行传播，回调内通过 `useAppStore.getState()` 读取最新状态，避免闭包陈旧值。
    - 当 `isPaused`、卫星为空或对象为碎片/缺少 TLE 时直接跳过，减少无意义计算。
    - 仅当至少一颗卫星传播成功时才调用 `setSatellites`，避免空更新触发全局重渲染。
    - `timeOffset` 直接叠加到 `Date.now()`，让时间轴回放与实时传播共用同一计算管线。
  - 工程价值与边界
    - 在“实时感”与“浏览器负载”之间提供可调平衡（默认 `10s` 周期）。
    - 该 hook 当前在主线程执行；若未来卫星规模继续增长，可迁移到 Web Worker。

### 7.3 SDG 分析与预测

- `src/lib/sdg/engine.ts`
  - 技术应用
    - SDG 评分引擎（指标模板 + 加权聚合 + 置信度评估）。
    - 评分方法论元数据内嵌（算法、卫星来源、更新频率、解释文案）。
  - 在该模块中的具体机制
    - `SDG_DEFINITIONS + indicatorSets` 固定定义六个目标（6/9/11/12/13/15）及各自指标模板、权重和数据来源。
    - `analyzeRegionAsync` 将 World Bank 最新指标映射到内部指标 ID，统一落到 0-100 分值空间并生成 `SDGScore` 列表。
    - `computeScore` 按权重计算综合分，`computeConfidence` 从四个维度计算置信度：
      指标一致性（方差）、趋势一致性、时间分辨率、来源多样性。
    - 缺失数据场景下采用安全回退（指标置零、趋势置稳），保证输出结构稳定不崩溃。
    - `getGlobalComparison` 以固定区域集合批量生成区域对比结果，供地图和排行榜直接消费。
  - 工程价值与边界
    - 输出不仅有分数，还有可解释元信息和置信度，支持“可读分析”而非黑盒值。
    - 当前评分框架是规则模型，不包含因果推断；解释性强但不代表政策因果结论。

- `src/lib/sdg/worldBankApi.ts`
  - 技术应用
    - World Bank 指标接入 + Prisma 缓存层（`sdgCache`）。
    - 指标归一化与时间序列聚合。
  - 在该模块中的具体机制
    - `REGION_CODES` 将产品内区域名映射到 World Bank 区域代码（如 `EAS/WLD`）。
    - `SDG_INDICATORS` 为每个 SDG 定义指标码、正负向（higherIsBetter）与归一化区间。
    - `fetchIndicator` 拉取 2015-2023 序列并按年份排序；网络失败时返回空数组而非抛出致命异常。
    - `fetchAndCache` 先查 TTL（24h）缓存，过期后抓取并按 `(region, indicatorCode, year)` 复合键 `upsert`。
    - `normalize` 把各量纲原值映射到 0-100，可直接和评分引擎拼接。
    - 对外提供三种消费接口：
      `getSDGData`（全量点）、`getLatestSDGValues`（最新点）、`getSDGTimeSeries`（按年聚合分）。
  - 工程价值与边界
    - 统一“外部数据 -> 本地标准分”转换口径，减少页面层重复转换代码。
    - 当前是串行抓取指标，强调稳健性；若指标规模继续增大可再引入并行限流策略。

- `src/lib/sdg/forecast.ts`
  - 技术应用
    - 经典时序预测（Holt 双指数平滑）。
    - 参数网格搜索与置信区间估计。
  - 在该模块中的具体机制
    - `holtForecast` 要求最少三年历史点，默认预测到 2030（或至少未来三年）。
    - 通过网格搜索 `alpha/beta` 最小化 MSE，再用最优参数重跑得到最终 level/trend。
    - 基于残差方差和步长扩张计算 95% 置信区间，输出 `lower/upper` 区间带。
    - 同时输出 `trendDirection/trendPerYear/projectedScore2030/modelConfidence`，方便 UI 直接展示。
    - 全量结果 clamp 到 0-100 区间，避免异常外推导致图表越界。
  - 工程价值与边界
    - 作为轻量可解释预测路径，稳定、快速、无需额外模型训练成本。
    - 对强非线性或结构突变序列表达能力有限，因此与神经网络路径并存。

- `src/lib/sdg/lstmForecast.ts`
  - 技术应用
    - 浏览器侧 TensorFlow.js 神经时序预测（实现为 GRU）。
    - Monte Carlo Dropout 不确定性估计。
  - 在该模块中的具体机制
    - `ensureTF` 懒加载 tfjs，避免非预测路径承担额外包体与初始化成本。
    - `trainGRUModel` 将多区域序列池化成滑窗样本（`WINDOW_SIZE=4`），训练 `GRU(8) -> Dense(1)`。
    - 训练支持 `onProgress` 回调与 `AbortSignal` 中断，避免长训练阻塞交互。
    - `gruForecast` 在推理阶段开启 `training:true` 做 MC Dropout（`MC_SAMPLES=30`），输出均值与 95% 区间。
    - `disposeModel` 显式释放模型张量资源，避免浏览器 GPU/内存持续增长。
  - 工程价值与边界
    - 相比规则模型，能学习更复杂动态并给出不确定性范围。
    - 预测质量依赖样本规模与数据质量，且前端训练有算力上限。

- `src/lib/sdg/quizBank.ts`
  - 技术应用
    - 结构化题库与测验抽题引擎。
    - 题目与选项双层随机化机制。
  - 在该模块中的具体机制
    - 题库按 SDG 维度拆分后合并为 `allQuestions`，每题包含 `explanation` 支持学习反馈。
    - `getQuizQuestions` 深拷贝题目后先做 Fisher-Yates 题目乱序，再对每题选项乱序并重算 `correctIndex`。
    - 辅助接口 `getAvailableSDGs/getQuestionCount/getTotalQuestionCount` 提供题库统计能力。
    - 通过“克隆后随机”策略保证源题库不可变，避免多次测验间串扰。
  - 工程价值与边界
    - 将教育互动逻辑从页面组件中抽离，题库扩展只需改数据层。
    - 目前为静态本地题库，不含在线更新与版本化管理。

### 7.4 游戏平衡与配置

- `src/lib/game/balance.ts`
  - 技术应用
    - 全局平衡参数中心（节奏、成长、物理、池容量）。
    - 函数化难度曲线（线性 + 二次项增长）。
  - 在该模块中的具体机制
    - 定义固定逻辑帧（`TICK_RATE/TICK_MS`）、玩家默认属性、刷怪距离、对象池上限、空间哈希粒度等基础常量。
    - `xpForLevel` 基于幂函数定义升级需求，控制前中后期升级节奏。
    - `enemyHpScale/enemyCountScale/enemySpeedScale` 统一给出随分钟增长的缩放倍率，避免各系统各自计算难度。
    - `bossHp` 将 Boss 强度与波次绑定，形成长期局的强度爬坡。
  - 工程价值与边界
    - 让“手感与难度”调参集中在一处，减少跨文件联动改数值的回归风险。
    - 常量层只给出策略旋钮，具体刷新编排由 `WaveManager` 与实体系统执行。

- `src/lib/game/enemies.ts`
  - 技术应用
    - 敌人字典配置（type-safe 数据驱动）。
    - 出场门槛与行为能力标签化（分裂、射击、群体生成、Boss）。
  - 在该模块中的具体机制
    - `EnemyType` 联合类型限定全敌种 ID，避免系统层出现字符串漂移。
    - `EnemyDef` 统一描述基础生命、速度、体积、接触伤害、经验、最早出场时间及行为扩展字段。
    - 大中小陨石通过 `splits/splitCount` 形成分裂链；射手类通过 `projectile/projectileCooldown` 启用远程行为。
    - `spawnAfterSec` 为刷新层提供时间门槛，确保前期不会出现不该出现的敌人类型。
    - `getSpawnableEnemies/getAllEnemyDefs` 提供刷新系统与调试工具的统一读取入口。
  - 工程价值与边界
    - 敌种扩展主要改配置，不需要侵入刷怪主逻辑。
    - 该层只定义“是什么”，不定义“何时刷多少”（由 `WaveManager` 负责）。

- `src/lib/game/weapons.ts`
  - 技术应用
    - 武器配置表驱动（按稀有度 + 五级成长曲线）。
    - 通用战斗参数向量化（`damage/cooldown/projectiles/speed/range/pierce/aoe/special`）。
  - 在该模块中的具体机制
    - `WeaponId` + `WeaponDef` 保证武器身份、显示信息、稀有度和数值成长同源。
    - 每个武器五级数据独立配置，支持不同武器的成长斜率与功能差异（持续型、回程型、激光型、AOE 型）。
    - `special` 字段承载武器特有语义（例如连锁数、持续时间、触发窗口、扩展行为参数），减少结构膨胀。
    - `getWeapon/getWeaponLevel/getAllWeapons/WEAPON_IDS` 作为系统和 UI 共享入口，避免重复硬编码。
  - 工程价值与边界
    - 平衡调整优先通过数据完成，显著降低对发射/碰撞逻辑的侵入频率。
    - 该层不执行任何发射行为，仅提供静态定义与读取接口。

- `src/lib/game/upgrades.ts`
  - 技术应用
    - 被动成长配置中心（被动词条字典）。
    - 数值与展示元数据并行管理。
  - 在该模块中的具体机制
    - `UpgradeDef` 统一定义名称、描述、图标、颜色、每级增益、单位和上限等级。
    - 同一配置同时服务于升级候选 UI 文案与玩家数值重算逻辑（`recalcPlayerStats`）。
    - `UPGRADE_IDS` 作为升级系统候选池枚举源，保证池子与定义一致。
  - 工程价值与边界
    - 被动扩展无需改升级系统结构，直接加定义即可接入。
    - 该层不处理被动与武器联动规则，组合逻辑由 synergy 与系统层判断。

- `src/lib/game/synergies.ts`
  - 技术应用
    - 融合规则引擎（武器条件 + 被动条件统一表示）。
    - 运行时激活判定与解锁列表规范化。
  - 在该模块中的具体机制
    - `SynergyRequirement` 支持 `weapon/passive` 双类型条件，统一要求 `id + level`。
    - `SYNERGIES` 定义融合技能及其 `effect` 标识，供 WeaponSystem/GameState 挂载实际能力。
    - `getActiveSynergies` 同时支持“自然达成条件”与“forcedSynergyIds 强制激活（测试/开局）”。
    - `normalizeUnlockedSynergies` 去重并过滤非法 ID，保证持久化数据安全。
    - `hasRequirementBase` 用于升级候选加权时识别“融合缺半”状态，提高关联技能出现率。
  - 工程价值与边界
    - 融合扩展从“写死 if-else”转为“配置 + 判定”模式，可维护性更高。
    - 当前仅定义规则与激活判断，具体融合伤害/轨迹由系统层实现。

- `src/lib/game/starterProgress.ts`
  - 技术应用
    - 开局技能解锁经济模型（碎片消耗 + 稀有度掉落权重）。
    - 解锁池规范化与奖励抽取策略。
  - 在该模块中的具体机制
    - 定义 `STARTER_DECRYPT_COST`、基础初始技能、清场碎片概率等经济常量。
    - `normalizeStarterUnlocked` 校验技能 ID 合法性并强制补入基础技能，防止账户数据异常导致无技能可选。
    - `rollStarterReward` 先按稀有度权重抽档，再在同档内优先未拥有技能；同档收集完后允许重复回退。
    - 返回 `isNew` 标志，供 UI 触发不同稀有度的解锁浮窗反馈。
  - 工程价值与边界
    - 在随机性和成长可预期之间做平衡，支持长期收集玩法。
    - 抽取逻辑当前基于 `Math.random`，非加密随机，不用于安全敏感场景。

- `src/lib/game/skillKnowledge.ts`
  - 技术应用
    - 技能到主题知识的语义映射层（玩法与站点主题联动）。
    - 结构化知识内容模型（标题、SDG、卫星、洞察）。
  - 在该模块中的具体机制
    - 以 `Record<WeaponId, SkillKnowledge>` 确保每个武器 ID 都可直接索引到对应知识卡片。
    - 字段拆分为 `title/sdg/satellite/insight`，便于 UI 以浮窗或卡片多段排版展示。
    - 文案将武器机制隐喻到 SDG 与遥感任务语境，形成“玩法反馈 -> 知识理解”闭环。
  - 工程价值与边界
    - 提升游戏系统与全站卫星/SDG叙事的一致性，增强内容辨识度。
    - 当前为静态文案映射，不包含多语言与动态知识源同步能力。

### 7.5 社区、检索与内容

- `src/lib/posts/types.ts`
  - 技术应用
    - 社区领域模型类型约束（帖子/评论/投票统一契约）。
  - 在该模块中的具体机制
    - `Post` 明确包含热度与互动衍生字段（`supportCount/commentCount/weeklyHotness/totalHotness`），对齐列表与详情页展示需求。
    - `Comment` 保持与帖子同一时间与投票结构约定，便于前端复用通用组件。
    - `PostVote` 通过 `targetType` 兼容 post/comment/sdg/article/paper/indicator 多目标投票语义。
  - 工程价值与边界
    - 将 API、store、UI 的数据契约固定在同一类型层，减少字段漂移。
    - 仅提供静态类型约束，不处理运行时数据校验。

- `src/lib/posts/db.ts`
  - 技术应用
    - 社区 DAO 层（Prisma 访问封装 + 领域映射）。
    - 投票切换事务语义与聚合查询。
  - 在该模块中的具体机制
    - `mapPost/mapComment/mapVote` 统一完成 Prisma 结果到领域模型的映射，并将时间字段规范化为 ISO 字符串。
    - 帖子与评论 CRUD 聚合在单库层，路由不直接拼装数据库细节。
    - `deletePost` 使用事务删除帖子及相关投票，避免孤儿投票数据残留。
    - `toggleVote` 实现三态行为（新增/取消/改票），统一前后端交互预期。
    - `getVoteCounts/getRecentVoteCount/getUserPostVotes` 提供聚合读取接口，供热度计算与用户态渲染复用。
  - 工程价值与边界
    - 路由层可专注 HTTP 语义与鉴权，数据一致性规则集中到 DAO 层维护。
    - 标签字段目前以 JSON 字符串存储并解析，后续可迁移为结构化数组列。

- `src/lib/posts/autoTag.ts`
  - 技术应用
    - 规则词典 + NLP 混合自动打标（`compromise`）。
    - 分层标签生成与质量控制。
  - 在该模块中的具体机制
    - 内置 `SDG_KEYWORDS` 与 `DOMAIN_TAGS` 两层词典，优先生成高价值主题标签。
    - `autoTagText` 按顺序执行：SDG 命中 -> 领域命中打分排序 -> NLP 名词短语补充。
    - 对标签进行清洗（括号/引号不平衡、标点噪声、长度阈值）与去重、数量上限控制。
    - `STOPWORD_NOUNS` 过滤 NLP 易误提取的通用词，提升标签可读性与检索价值。
  - 工程价值与边界
    - 在无需外部模型服务的前提下提供稳定自动标注，显著降低人工维护成本。
    - 当前策略偏规则驱动，语义覆盖受词典质量影响。

- `src/lib/search/semanticSearch.ts`
  - 技术应用
    - BM25 风格加权检索（标题/标签/摘要/作者多字段融合）。
    - 语义扩展检索（SDG/领域词典扩展 + 中英混合分词）。
  - 在该模块中的具体机制
    - `parseQuery` 自动识别中文并调用 `segmentChinese`，英文查询执行停用词过滤。
    - `expandTokens` 利用 `SDG_KEYWORDS/DOMAIN_TAGS` 反向索引做同域词扩展，扩展词以较低权重参与评分。
    - `scoreDocument` 对 direct token 做 BM25 归一化计分，对 expanded token 做降权补分。
    - 多词查询触发短语命中加成，提高精确匹配排序优先级。
    - `rankArticles/rankPapers` 分别按文档结构计算平均长度并输出排序结果。
  - 工程价值与边界
    - 检索结果不再依赖简单包含关系，能更贴近用户意图与领域语义。
    - 当前为轻量本地排序，不包含向量检索和跨文档语义嵌入。

- `src/lib/search/zhDictionary.ts`
  - 技术应用
    - 中英领域词典驱动的中文分词与语义映射。
    - 贪心最长匹配分词策略。
  - 在该模块中的具体机制
    - `ZH_EN_DICT` 维护“中文术语 -> 英文 token 集”映射，覆盖 SDG、遥感、气候、轨道等领域术语。
    - 词典按中文长度降序排序，`segmentChinese` 扫描时优先匹配最长词条，减少切分歧义。
    - 未匹配片段进入英文缓冲再按空格分词，兼容中文句子中的英文缩写混输场景。
    - 输出前做去重并保序，保证搜索 token 稳定可控。
  - 工程价值与边界
    - 显著改善中文查询与英文资料库之间的召回桥接能力。
    - 召回能力依赖词典覆盖率，新增术语需要持续维护词条。

- `src/lib/content/data.ts`
  - 技术应用
    - 内容域静态数据模型与离线样本库。
    - 文章/论文双数据源类型统一。
  - 在该模块中的具体机制
    - 定义 `Article/Paper` 类型，固定前端展示与检索依赖字段（标题、摘要、标签、来源、DOI 等）。
    - `MOCK_ARTICLES/MOCK_PAPERS` 提供多主题样例，覆盖 climate/earth-science/space-tech/sustainability 分类。
    - 时间、阅读时长、分类字段齐备，可在后端同步失败时直接渲染完整页面。
  - 工程价值与边界
    - 保障 Science/Content 模块在弱网或外部源异常下仍可开发与演示。
    - 数据为演示样本，不代表实时权威内容。

- `src/lib/science/syncArticles.ts`
  - 技术应用
    - 多源内容聚合同步（RSS + Semantic Scholar + arXiv）。
    - 清洗标准化 + Prisma 缓存持久化管线。
  - 在该模块中的具体机制
    - 通过 `isCacheFresh` 对 article/paper 分表做 TTL 判断（12h），优先复用缓存减少外部请求。
    - RSS 路径：多源并发抓取 -> XML 解析 -> HTML 清洗 -> 摘要截断 -> 自动打标签 -> 分类 -> upsert 入库。
    - 学术路径：Semantic Scholar 与 arXiv 分别抓取并标准化作者、摘要、期刊/来源、DOI 后写入统一 `paperCache`。
    - 清洗函数处理 HTML 实体、LaTeX 公式、作者截断、阅读时长估计，统一输出前端友好文本。
    - 对外暴露 `getArticles/getPapers`，在同步失败时回退旧缓存，保证页面持续可用。
  - 工程价值与边界
    - 实现“异构来源 -> 同构内容模型”的统一入口，前端无需关心源站差异。
    - 当前去重主要依赖源 ID/hash，跨源语义去重仍有提升空间。

### 7.6 统计、积分与通知

- `src/lib/stats/dashboardStats.ts`
  - 技术应用
    - 仪表盘统计聚合与近距离会合计算。
    - 轨道对象几何距离估算（地表距离 + 高度差）。
  - 在该模块中的具体机制
    - 通过 `haversineDistance + altitude diff` 计算三维近似距离，用于会合告警筛选。
    - `computeConjunctions` 对非碎片卫星做两两比较，并按阈值输出 `warning/info` 分级告警。
    - `computeDashboardStats` 汇总活跃卫星、碎片数量、会合告警数量，直接供主页卡片消费。
    - `computeLeoDensity` 根据 LEO 卫星数量给出 HIGH/MODERATE/LOW 密度标签。
  - 工程价值与边界
    - 将首页关键态势指标计算集中化，避免 UI 层重复实现统计逻辑。
    - 距离模型是展示级近似，不是高精度轨道会碰预报模型。

- `src/lib/stats/alertGenerator.ts`
  - 技术应用
    - 规则驱动告警编排（多信号融合到统一 alert 流）。
    - 告警数量与优先级控制。
  - 在该模块中的具体机制
    - 按固定顺序生成告警：会合风险 -> SDG 最优分更新 -> 最近追踪活动 -> 密度/目录兜底。
    - 高优先信息（会合）优先入列，低优先信息仅在告警不足时补齐。
    - 输出统一 `SystemAlert` 结构（id/type/msg/time），便于前端统一渲染。
    - 最终裁剪到固定条目上限，保证面板信息密度稳定。
  - 工程价值与边界
    - 把多来源信号聚合成可读告警流，避免首页信息碎片化。
    - 当前规则为启发式，不包含学习型告警优先级模型。

- `src/lib/stats/featuredArticles.ts`
  - 技术应用
    - 内容推荐评分器（投票质量 + 参与度 + 新鲜度融合）。
    - 分类到视觉映射的展示协议。
  - 在该模块中的具体机制
    - 对每篇文章计算综合分：支持率、投票总量转参与度、14 天内时效加成。
    - 当实时文章列表为空时自动回退 `MOCK_ARTICLES`，保证推荐模块可用。
    - `CATEGORY_MAP` 将内容分类映射为 UI 标签与强调色，减少视图层分支逻辑。
    - 输出 `FeaturedArticle` 结构，统一首页推荐卡片字段。
  - 工程价值与边界
    - 在“质量优先”与“时效优先”之间取得平衡，保持推荐内容可读性。
    - 当前为轻量规则排序，不含用户画像个性化推荐。

- `src/lib/stats/medalComputation.ts`
  - 技术应用
    - 成就规则引擎（追踪行为 + 投票行为组合判定）。
    - 进度百分比计算与达成态输出。
  - 在该模块中的具体机制
    - `MEDAL_DEFS` 定义奖章元数据，`computeMedals` 基于实时用户行为计算 `earned/progress`。
    - 追踪类成就覆盖数量阈值与特定卫星类型命中（ISS、气象、导航）。
    - 社区类成就覆盖 SDG 主题投票、文章论文投票、指标投票与总投票量。
    - `SDG_VOTE_KEYS` 作为主题投票规范集合，供其他模块复用一致判定口径。
  - 工程价值与边界
    - 将成长反馈从 UI 文案升级为可计算规则，便于积分和通知系统联动。
    - 规则基于当前行为快照，不包含时序衰减或赛季机制。

- `src/lib/points/economy.ts`
  - 技术应用
    - 积分经济配置与等级体系映射。
    - 数据库原子增减接口封装。
  - 在该模块中的具体机制
    - 定义奖励常量（成就/投票/发帖/评论/答题）与消费常量（模型/动作等价格）。
    - `getLevel` 依据 `totalEarned` 映射等级称号与下一阈值，供 Profile 与 HUD 统一展示。
    - `awardPoints` 对 `points + totalEarned` 同步递增；`deductPoints` 做下限保护避免负值。
    - 所有积分变更集中走该层，避免各路由散落手写更新逻辑。
  - 工程价值与边界
    - 把经济参数和升级逻辑集中治理，便于后续调价与活动扩展。
    - 当前扣分同时减少 `totalEarned`，采用“净值式累计”口径而非“历史总赚取”口径。

- `src/lib/notifications/create.ts`
  - 技术应用
    - 通知写入工厂（按业务事件构造统一通知对象）。
    - 奖章通知去重策略。
  - 在该模块中的具体机制
    - 为会合预警、评论回复、奖章解锁提供独立创建函数，统一写入 Prisma `notification`。
    - 通知体统一包含 `type/title/body/metadata`，metadata 序列化关键上下文供前端扩展使用。
    - `createMedalNotification` 在写入前查重，避免同一奖章重复解锁造成通知刷屏。
  - 工程价值与边界
    - 将通知生成语义从路由剥离，降低重复模板和字段不一致问题。
    - 去重当前基于 metadata 文本匹配，后续可升级为结构化唯一键去重。

### 7.7 地图、地面网络与工具

- `src/lib/geo/worldGeo.ts`
  - 技术应用
    - 标准世界底图加载与 TopoJSON 转换（`world-atlas + topojson-client`）。
    - 多粒度地理要素导出（国家面、陆地面、内边界线）。
  - 在该模块中的具体机制
    - 从 `countries-110m.json` 读取拓扑数据后，统一转换为 GeoJSON 可消费结构。
    - `worldCountries` 输出国家级 FeatureCollection，用于国家维度着色或 hover 交互。
    - `worldLand` 输出合并陆地轮廓，适合背景层快速渲染。
    - `worldBorders` 通过 `mesh(a !== b)` 仅提取国家内边界，避免海岸线重复描边。
  - 工程价值与边界
    - 为地图组件提供“一次转换、多场景复用”的基础几何资产。
    - 110m 数据偏展示性能，不适合高精度边界分析场景。

- `src/lib/geo/worldGeoSimple.ts`
  - 技术应用
    - 低复杂度手工简化世界几何数据（FeatureCollection）。
    - 面向性能优先场景的极简地图资产。
  - 在该模块中的具体机制
    - 直接内置大洲/区域级 Polygon 与 MultiPolygon，跳过运行时拓扑转换。
    - 保留最小识别度的地域轮廓和 `name` 属性，支持 tooltip 与点击语义。
    - 被 `ClimateMap` 与 `StationMap` 等轻量地图场景复用，减少首屏几何处理负担。
  - 工程价值与边界
    - 显著降低路径点数量与绘制成本，适合高交互或低端设备场景。
    - 几何为示意级，不保证行政边界精度和拓扑严谨性。

- `src/lib/ground/data.ts`
  - 技术应用
    - 地面站网络域模型与样本数据集。
    - 站点属性标准化 + 数据链路语义建模。
  - 在该模块中的具体机制
    - 定义 `GroundStation/DataPipeline` 类型，统一站点坐标、频段、吞吐、状态、SDG 贡献等字段。
    - `MOCK_GROUND_STATIONS` 覆盖多运营商、多洲站点，包含 `operational/maintenance/offline` 状态用于 UI 演示差异化。
    - `MOCK_DATA_PIPELINES` 描述“卫星 -> 地面站 -> 处理中心 -> SDG 指标”的链路及延迟，支持数据流可视化。
    - 提供运营商颜色、站点类型标签、图形形状映射，供图例和节点渲染统一引用。
  - 工程价值与边界
    - 让地面网络页面在无外部接口时仍可完整演示拓扑、覆盖与链路分析。
    - 当前数据为模拟样本，不代表真实实时站网运维状态。

- `src/lib/climate/data.ts`
  - 技术应用
    - 气候事件域模型与多灾种统一编码。
    - 事件视觉语义映射（颜色/标签/图标）。
  - 在该模块中的具体机制
    - 定义 `ClimateEvent` 统一字段：灾种、位置、严重度、监测卫星、SDG 影响、影响面积、状态与来源。
    - `EVENT_TYPE_COLORS/LABELS/ICONS` 提供灾种到 UI 视觉元素的集中映射。
    - `getRegionFromCoords` 以经纬度区间做区域归类，为分区统计和地图筛选提供基础规则。
    - `MOCK_CLIMATE_EVENTS` 覆盖地震、火灾、洪水、气旋、火山、干旱、冰损、热浪等多类型事件样本。
  - 工程价值与边界
    - 将异构灾害事件抽象为统一结构，便于面板、地图和趋势模块共享处理逻辑。
    - 区域归类基于启发式经纬度范围，不是行政区 GIS 精确匹配。

- `src/lib/user/trackedSatellites.ts`
  - 技术应用
    - 用户追踪卫星关系持久化 DAO。
    - 事务化“替换写入”策略。
  - 在该模块中的具体机制
    - `getTrackedSatellites` 仅查询当前用户关联表并返回 `satelliteId` 列表。
    - `setTrackedSatellites` 使用事务执行“deleteMany + createMany”整批替换，确保提交后状态与前端选择一致。
    - 将用户偏好关系与卫星主数据解耦，避免主表污染。
  - 工程价值与边界
    - 简化追踪列表同步语义，避免逐条增删带来的状态漂移。
    - 替换写入策略在高并发编辑场景下可能覆盖并行修改，需要上层控制写入时序。

- `src/lib/units.ts`
  - 技术应用
    - 单位换算与显示格式化工具（km/mi）。
    - 展示口径统一函数化。
  - 在该模块中的具体机制
    - 通过固定换算系数 `KM_TO_MI` 统一里程与速度单位转换。
    - `formatAltitude/formatVelocity` 同时处理换算与小数位控制，直接输出带单位字符串。
    - 前端面板统一调用该层，避免同字段在不同页面出现不同精度/单位表现。
  - 工程价值与边界
    - 保证全站单位展示一致，降低 UI 文案与数值格式偏差。
    - 当前仅覆盖 km/mi 与 km/s、mi/s，不含更复杂单位体系（如 m/s、knots）。

### 7.8 `src/lib/mmd` 运行时

- `src/lib/mmd/MMDLoader.js`
  - 技术应用
    - 基于 Three.js `Loader` 体系扩展 MMD 资源加载流程（PMD/PMX/VMD/VPD）。
    - 通过 `FileLoader + mmdparser + MeshBuilder/AnimationBuilder` 建立“二进制解析 -> 几何/骨骼 -> 动画轨道”的装配链。
    - 材质层融合 `MMDToonShader`、`TGALoader` 与纹理路径重写，兼容 MMD 常见贴图与 toon 表现。
  - 具体机制
    - `load()` 先识别模型扩展名，再调用 parser 的 `parsePmd/parsePmx` 输出中间结构，最后由 MeshBuilder 组装 `SkinnedMesh + Skeleton + Morph`。
    - `loadAnimation()` 把 VMD 转为 `AnimationClip`，并根据目标是 mesh 还是 camera 走不同轨道构建路径，保证镜头动作与角色动作都可复用同一输入格式。
    - 内部实现了 MMD Cubic Bezier 插值计算，将 VMD 插值参数映射到 Three.js 插值器，避免“关键帧正确但运动节奏错误”的问题。
    - `MMDToonMaterial` 在 shader uniform 上做属性映射，使上层按普通材质属性写入时仍能驱动 MMD toon + matcap 的复合光照。
  - 工程价值与边界
    - 价值：把历史 MMD 资产无缝接入 WebGL 运行时，减少格式迁移成本。
    - 边界：该 loader 为 vendor 版本并带有弃用提示，长期应考虑迁移到独立维护仓库版本以降低未来升级风险。

- `src/lib/mmd/MMDAnimationHelper.js`
  - 技术应用
    - 作为运行时编排器统一管理动画混合器、IK、Grant、Physics、相机与音频节奏。
    - 使用 `WeakMap` 维护对象级状态，支持 mesh/camera/audio 三类对象共用同一更新循环。
  - 具体机制
    - `add/remove/update` 提供一体化生命周期；`update(delta)` 按顺序推进动画与物理，确保骨骼结果与刚体结果在同一帧内收敛。
    - `configuration.sync` 会对多个对象的 clip 时长进行对齐，避免多对象组合场景出现循环错位。
    - 提供 `pose()` 用 VPD 直接写骨骼姿态，并可选择是否启用 IK/Grant 修正，适用于静态姿态回放与拍照场景。
    - 支持 `sharedPhysics` 实验路径，允许多模型共享物理世界，降低多角色同屏时的物理世界开销。
  - 工程价值与边界
    - 价值：把“动画系统”和“物理系统”耦合点封装在 helper 内，业务层只需维护时间驱动。
    - 边界：模块同样处于 vendor 兼容层，复杂场景要警惕隐式状态残留，因此本项目在烘焙流程中采用“每次 fresh mesh”规避累计误差。

- `src/lib/mmd/MMDPhysics.js`
  - 技术应用
    - Ammo.js（Bullet）与 Three 骨骼系统的桥接层。
    - 刚体/约束/骨骼三者的双向同步（骨骼驱动刚体、刚体回写骨骼）。
  - 具体机制
    - `update(delta)` 在 stepSimulation 前后分别执行 `_updateRigidBodies` 与 `_updateBones`，形成“动画输入 -> 物理求解 -> 骨骼输出”的闭环。
    - 对非单位缩放模型先临时归一化再求解，完成后恢复原缩放，避免 Bullet 在非常规尺度下数值不稳。
    - 暴露 `warmup/reset/setGravity` 用于姿态稳定、重力切换与循环边界处理，是离线烘焙稳定性的关键控制点。
    - `dispose()` 显式销毁 Ammo C++ 对象（constraint/body/shape/motion state），防止 wasm 堆内存持续增长。
  - 工程价值与边界
    - 价值：保证布料、头发等物理骨骼具备可控且可复现的动态表现。
    - 边界：实时物理成本高，因此项目引入离线烘焙缓存，在多数播放路径上避免每帧运行 Bullet。

- `src/lib/mmd/CCDIKSolver.js`
  - 技术应用
    - CCD（Cyclic Coordinate Descent）逆向运动学求解。
    - 约束旋转上下限、轴限制、迭代次数控制。
  - 具体机制
    - 以 effector/target/link 链为输入逐层迭代，通过局部坐标系下向量夹角计算并施加四元数旋转，逐步逼近目标点。
    - 对极小角度变化直接跳过以减轻抖动；支持 `minAngle/maxAngle` 与 link 限制，防止关节出现非生理扭转。
    - 提供 `CCDIKHelper` 调试可视化，便于检查链路方向、目标点与实际骨骼收敛关系。
  - 工程价值与边界
    - 价值：在不增加动画资源量的前提下提升动作自然度与末端贴合能力。
    - 边界：纯 CCD 在极端姿态下仍可能出现局部震荡，需与骨骼限制参数联合调优。

- `src/lib/mmd/MMDToonShader.js`
  - 技术应用
    - 在 Three `ShaderLib.phong` 基础上拼接 toon + matcap 的混合着色管线。
    - 通过 `UniformsUtils.merge` 合并 toon/phong/matcap uniforms，统一材质参数入口。
  - 具体机制
    - 将 `lights_phong_pars_fragment` 替换为 MMD toon 光照实现，使用 gradient irradiance 而非传统 dotNL 漫反射。
    - 额外注入 matcap 片段并提供 add/multiply 两种混合分支，实现 MMD 常见“硬边卡通 + 球面映射”风格。
    - 保持与 Three 主材质体系兼容，便于上层在不改渲染主循环的前提下切换 MMD 材质。
  - 工程价值与边界
    - 价值：保证角色渲染风格与 MMD 资产预期一致，避免“动作对了但质感不对”。
    - 边界：属于定制 shader 拼接方案，后续升级 Three 主版本时需重点回归 shader chunk 变更。

- `src/lib/mmd/mmdparser.module.js`
  - 技术应用
    - 二进制/文本解析器，覆盖 PMD、PMX、VMD、VPD 等 MMD 资产格式。
    - 低层 `DataViewEx` 读取器封装（整型、浮点、索引、字符编码与数组批量读取）。
  - 具体机制
    - 提供 `parsePmd/parsePmx/parseVmd/parseVpd`，逐段解析 header、vertices、bones、morph、rigid bodies、constraints 等结构体。
    - 内置左右手坐标系转换与索引顺序调整，确保 MMD 原始坐标能够映射到 Three 场景坐标。
    - 解析阶段直接产出结构化 JS 对象，供上层 builder 组装几何、骨骼和动画轨道。
  - 工程价值与边界
    - 价值：把复杂文件格式处理集中在 parser 层，业务代码只消费统一对象模型。
    - 边界：vendor 文件体量大，维护成本高；项目中按“只包装、不改底层”原则降低 fork 风险。

- `src/lib/mmd/loadAmmo.ts`
  - 技术应用
    - 浏览器端 wasm 运行时懒加载 + 单例 Promise 去重。
    - 运行时脚本注入与全局工厂函数调用（`window.Ammo`）。
  - 具体机制
    - 首次调用时动态插入 `/libs/ammo.wasm.js`，并通过 `locateFile` 显式指向 wasm 二进制路径，避免部署路径变化导致加载失败。
    - 使用模块级 Promise 缓存初始化过程，阻止并发触发重复加载或竞态初始化。
    - 初始化完成后写回全局 `window.Ammo`，为 vendor 物理模块提供统一入口。
  - 工程价值与边界
    - 价值：显著缩短首屏路径，只有进入 MMD/物理相关流程时才加载重资源。
    - 边界：依赖浏览器环境与全局对象，服务端渲染阶段不可直接执行。

- `src/lib/mmd/modelData.ts`
  - 技术应用
    - 角色与模型商品化配置中心（元素、区域、SDG 标签、价格映射）。
    - 多语言展示字段（中英文）与资源路径统一索引。
  - 具体机制
    - `PRICE_MODEL` 作为价目基准，`MODELS` 与 `CHARACTER_MODELS` 绑定商店、角色选择与运行时加载三类场景。
    - 每个条目集中定义 `id/path/name/color/element/region/sdg` 等元数据，前端无需在多个页面重复维护映射。
    - 通过导出只读列表让 UI 与业务层共享同一事实源，降低配置漂移。
  - 工程价值与边界
    - 价值：把“内容资产”和“商业规则”绑定在统一数据层，便于扩展新角色与运营活动。
    - 边界：当前为静态配置，若后续做动态运营需迁移到数据库或 CMS。

- `src/lib/mmd/bakeCache.ts`
  - 技术应用
    - IndexedDB 持久化缓存（对象存储 + 版本控制）。
    - TypedArray 序列化/反序列化桥接（`Float32Array <-> ArrayBuffer`）。
  - 具体机制
    - 数据库存储名为 `sms-bake-cache`，`bakes` store 以 key(`charId::vmdPath`)索引烘焙结果。
    - 读取时把 ArrayBuffer 还原为 `Float32Array`，供运行时直接喂给关键帧回放，无需二次转换。
    - 通过 `ensureBakeVersion` 对参数变更做整体失效：当版本号变化时自动清缓存，避免旧参数缓存污染新渲染结果。
  - 工程价值与边界
    - 价值：把高成本物理计算从“每次运行”降为“首次构建后复用”，显著改善加载后交互流畅度。
    - 边界：受浏览器存储配额限制，需控制缓存数据规模并做好失效策略。

- `src/lib/mmd/bakePhysics.ts`
  - 技术应用
    - 离线物理烘焙管线：动画 + IK + Grant + Bullet 逐帧求解并采样。
    - 时域平滑（Gaussian window）消除抖动，提高循环播放稳定性。
  - 具体机制
    - 先识别 physics-driven bones（刚体 type 非静态），仅记录这些骨骼的位置/四元数，降低烘焙数据体积。
    - 执行“预热 -> frame0 对齐 -> 超重力过渡 -> 预仿真 -> 正式录制”流程，解决布料在循环边界漂浮、穿模、初始相位不稳问题。
    - 使用 batch 让出主线程（`setTimeout(0)`）并支持 abort/progress，防止长烘焙阻塞 UI。
    - 录制输出是紧凑 `Float32Array`（position/quaternion 分离布局），便于 IndexedDB 存储与高效回放。
  - 工程价值与边界
    - 价值：以一次性计算换取长期播放性能，且可得到更可复现的动作结果。
    - 边界：烘焙参数（fps/重力/步长）变化会触发重建，需和缓存版本号严格联动。

- `src/lib/mmd/preBakeAll.ts`
  - 技术应用
    - 烘焙任务调度器（角色 x 动作笛卡尔积扫描、缺失项补齐、进度回调）。
    - 新鲜 mesh 策略与缓存增量更新策略。
  - 具体机制
    - 先对比 `getAllKeys()` 与目标组合，只烘焙缺失项，避免重复计算；配置变化通过 `ensureBakeVersion` 统一失效。
    - 每个任务都重新 `loadMesh + loadVMD`，确保 Ammo 状态不跨任务污染，规避 helper remove 后 C++ 对象残留副作用。
    - 提供 `rebakeOne()` 用于单条重建，支持局部修复与调参验证，而无需全量重烘焙。
  - 工程价值与边界
    - 价值：把离线物理资产构建从手工流程变为可编排流程，支持首访自动准备与增量维护。
    - 边界：首次全量构建时间仍受设备性能影响，产品侧需配合进度提示与容错策略。

## 8. 状态管理（`src/store`）

- 状态管理总览
  - 技术应用
    - 全仓库采用 Zustand 的 `create` 轻量 store 方案，而不是 Redux Toolkit；核心目标是降低样板代码并保持模块级自治。
    - 状态按业务域拆分（auth、app、posts、game、points 等），避免单一全局状态树在高频 UI 场景中的无关重渲染。
    - 网络读写直接放在 store action 中，组件层只调用动作并消费状态，形成“页面组件薄、状态层厚”的结构。
  - 具体机制
    - 各 store 基本都维持 `state + async actions + optimistic/rollback` 三段式结构。
    - 客户端持久化采用按域拆分的 `localStorage` key（例如游戏高分、飞船外观）而不是整库序列化，降低版本迁移成本。
    - 与服务端同步时优先容错（大多 `catch` 静默处理），保证弱网条件下 UI 不被阻断。
  - 工程价值与边界
    - 价值：开发迭代速度快，业务功能能以独立 store 形式快速落地。
    - 边界：未统一引入中间件（如 devtools/persist/immer），复杂事务一致性依赖人工约束与代码评审。

- `src/store/appStore.ts`
  - 技术应用
    - 作为跨页面“主控 store”，聚合卫星可视化、用户偏好、时间轴、面板开关、区域比较等核心 UI 状态。
    - 通过 TypeScript 接口（`SatelliteData`、`UserProfile`、`UserPreferences`）约束跨模块数据形状。
  - 具体机制
    - `trackedSatellites` 的改动由 `toggleTracked` 触发后使用 `queueMicrotask` 调 `syncTrackedToServer`，把本地交互响应与网络写入解耦。
    - `satelliteDensity`、`timeOffset` 等控制项在 setter 内直接做边界收敛（密度与时间范围 clamp），避免无效值进入渲染链路。
    - `_densitySeed + reshuffleSatellites` 形成“可重排但可复现”的选择基座，给 selector 侧的 seeded 随机提供触发信号。
    - `comparisonRegions` 限制最多四个区域，`toggleComparisonRegion` 在动作层防止越界，减少组件重复判断。
    - `resetUserState` 在登出时集中清理用户相关状态，避免帐号切换后的脏数据串联。
  - 工程价值与边界
    - 价值：把大量跨页面交互状态集中在单点，降低页面间 props 传递复杂度。
    - 边界：状态面较大，后续若继续扩展建议拆分子域或使用 selector 细粒度订阅避免性能抖动。

- `src/store/authStore.ts`
  - 技术应用
    - 前端认证会话状态机（`isAuthenticated/user/isLoading/error`）的最小实现。
    - 与 `/api/auth/*` 路由配合完成登录、注册、登出与会话检查。
  - 具体机制
    - `login/register` 在请求前统一置 `isLoading` 并清空错误，失败后回填后端错误信息，保证表单可直接消费。
    - `checkAuth` 通过 `/api/auth/me` 做会话探测，页面初始化时可快速恢复用户态。
    - `logout` 使用 `finally` 清本地状态，确保即便网络失败也不会保留错误登录态。
    - `clearError` 提供显式错误生命周期控制，避免跨页面残留提示。
  - 工程价值与边界
    - 价值：认证逻辑集中、可预期，页面层不需要分散处理认证 API 细节。
    - 边界：当前未细分错误码语义与重试策略，复杂认证流程（多因子、刷新 token）需要进一步扩展。

- `src/store/postsStore.ts`
  - 技术应用
    - 社区域复合状态管理：帖子 CRUD、评论 CRUD、帖子/评论投票在同一 store 中编排。
    - 高交互操作采用 optimistic update + rollback，优先保证点击反馈速度。
  - 具体机制
    - `fetchPosts` 一次拉取 `posts/userVotes/commentsByPost`，减少社区首页初始化的往返请求。
    - `commentsByPost: Record<string, Comment[]>` 以帖子 id 分桶存储评论，支持局部更新单贴评论而不重拉全量。
    - `votePost/voteComment` 先基于当前 `userVotes` 推导增减量并更新 UI，再调用 API；失败时回滚快照，成功时以服务端计数再对齐。
    - `deletePost` 同步清理 `commentsByPost[postId]`，避免悬挂评论数组占用内存与造成 UI 幽灵数据。
    - `resetUserState` 在用户切换后清空投票态，防止投票身份串号。
  - 工程价值与边界
    - 价值：社区操作响应快、回滚路径明确，交互体验明显优于“请求成功后再刷新”模式。
    - 边界：单 store 承担职责较重，后续可以把评论与投票进一步拆分以提升维护性。

- `src/store/contentVotesStore.ts`
  - 技术应用
    - 针对“非帖子内容”（SDG 指标/文章/论文等）的统一投票状态域。
    - 投票计数与情绪趋势（`sentimentTrend`）并行管理，支持数据看板联动。
  - 具体机制
    - `counts` 与 `userVotes` 用 targetId 做 key，实现跨内容类型的统一数据结构。
    - `castVote` 采用和社区区块一致的 optimistic 更新策略，支持重复点击取消投票。
    - 投票成功后触发 `fetchSentimentTrend()`，使趋势图与最新行为保持同步。
    - `fetched` 标记用于避免重复初始化请求，`reset()` 负责重建该域状态并触发重新拉取。
  - 工程价值与边界
    - 价值：把“内容态度反馈”抽象成通用能力，便于未来扩展到更多内容类型。
    - 边界：目前趋势数据刷新是全量拉取；高并发场景可考虑增量更新或节流。

- `src/store/notificationStore.ts`
  - 技术应用
    - 通知中心状态管理，覆盖弹窗开关、列表拉取、单条已读与全部已读。
    - 使用本地状态即时更新未读数，减少“标记后再整页重拉”的等待。
  - 具体机制
    - `fetchNotifications` 同时接收 `notifications` 与 `unreadCount`，避免前端二次统计。
    - `markAsRead(ids)` 更新服务端后，本地按 id 映射为已读，并只扣减原本未读的条目数量，防止重复扣减。
    - `markAllRead` 把本地列表统一置读并清零计数，保证抽屉 UI 与角标一致。
    - `isOpen/setIsOpen/toggleOpen` 把展示态也放进 store，便于顶栏与面板组件共享控制。
  - 工程价值与边界
    - 价值：通知系统行为闭环完整（读、未读、列表、角标一致性）。
    - 边界：当前错误处理以静默为主，若用于高优先级告警需补充失败反馈机制。

- `src/store/pointsStore.ts`
  - 技术应用
    - 积分经济域状态中心，联动 `/api/points`、`/api/dances`、`/api/shop/purchase`。
    - 直接消费 `getLevel` 结果，将等级演算结果作为状态的一部分输出给 UI。
  - 具体机制
    - `fetchPoints` 同步刷新 points/totalEarned/level/purchases，确保积分与等级视图来自同一快照。
    - `fetchDances` 除了拉取动作列表，还处理后端返回的 `refunded`，并在有退款时自动触发 `fetchPoints` 对账。
    - `purchaseItem` 以布尔值返回交易结果，并在成功后刷新积分态，便于调用侧决定 toast 与后续流程。
    - store 内部维护 `isLoading`，支持商店页面做显式加载反馈而不依赖组件局部状态。
  - 工程价值与边界
    - 价值：把“购买、退款、等级计算”统一在同一数据域，避免商店和个人页数据不一致。
    - 边界：未实现请求并发去重；高频购买操作可考虑引入事务锁或请求队列。

- `src/store/gameStore.ts`
  - 技术应用
    - 游戏局外进度状态：高分榜、累计统计、飞船外观、当前对局标记。
    - 浏览器本地持久化（`localStorage`）与运行时状态组合。
  - 具体机制
    - `addHighScore` 把分数插入后排序并截断前十，再写入 `sat-game-highscores`。
    - `loadHighScores` 在一次读取中恢复高分、累计统计与飞船配置三个 key，减少初始化分散 IO。
    - `setSelectedHull/setSelectedColor` 使用“读旧值 -> 改字段 -> 回写”方式维护同一 ship 配置对象。
    - `addRunStats` 在 `set` 回调内完成累加与持久化，保证写盘数据和内存状态一致。
  - 工程价值与边界
    - 价值：无需后端即可保留玩家长期进度，降低功能接入门槛。
    - 边界：数据仅本地有效，跨设备同步需要后续接入账户化存储。

- `src/store/selectors.ts`
  - 技术应用
    - React `useMemo` + Zustand store selector 的派生数据层。
    - 采用 seeded PRNG（`mulberry32`）实现可复现随机抽样。
  - 具体机制
    - `useVisibleSatellites` 把原始卫星分为 debris 与 non-debris，并保证 debris 全量可见。
    - 非碎片卫星先按 seed 洗牌，再把 tracked 项强制前置并始终保留，剩余槽位按 `satelliteDensity` 填充。
    - 依赖 `densitySeed` 控制重排时机，从而在登录/登出或显式 reshuffle 时获得“稳定但可更新”的视觉分布。
  - 工程价值与边界
    - 价值：把复杂可视化筛选逻辑下沉为可复用 selector，页面层只消费最终列表。
    - 边界：当前算法为内存内全量洗牌，若卫星数量继续上升可考虑分层采样或 worker 化处理。

## 9. API 总览（`src/app/api`）

> 下表是按功能分组的 route handlers，总计完整覆盖当前 `src/app/api/**/route.ts`。

### 9.1 Auth / User

| 路由                           | 方法      | 鉴权 | 作用              |
| ------------------------------ | --------- | ---- | ----------------- |
| `/api/auth/register`           | `POST`    | 公共 | 注册并签发 JWT    |
| `/api/auth/login`              | `POST`    | 公共 | 登录并签发 JWT    |
| `/api/auth/logout`             | `POST`    | 登录 | 退出登录          |
| `/api/auth/me`                 | `GET`     | 登录 | 读取当前用户      |
| `/api/user/[id]/profile`       | `GET`     | 公共 | 获取公开 profile  |
| `/api/user/profiles/batch`     | `POST`    | 公共 | 批量查询用户资料  |
| `/api/user/tracked-satellites` | `GET/PUT` | 登录 | 读取/更新追踪卫星 |
| `/api/user/equipped-medals`    | `GET/PUT` | 登录 | 读取/更新装备奖章 |

### 9.2 Posts / Community

| 路由                                        | 方法             | 鉴权                | 作用                             |
| ------------------------------------------- | ---------------- | ------------------- | -------------------------------- |
| `/api/posts`                                | `GET/POST`       | GET公共、POST登录   | 帖子列表/创建                    |
| `/api/posts/[id]`                           | `GET/PUT/DELETE` | GET公共、写操作登录 | 帖子详情/编辑/删除               |
| `/api/posts/[id]/vote`                      | `POST`           | 登录                | 帖子投票                         |
| `/api/posts/[id]/comments`                  | `GET/POST`       | GET公共、POST登录   | 评论列表/创建                    |
| `/api/posts/[id]/comments/[commentId]`      | `PUT/DELETE`     | 登录                | 评论编辑/删除                    |
| `/api/posts/[id]/comments/[commentId]/vote` | `POST`           | 登录                | 评论投票                         |
| `/api/content-votes`                        | `GET/POST`       | GET公共、POST登录   | 内容类投票（SDG/文章/论文/指标） |
| `/api/sentiment-trend`                      | `GET`            | 公共                | 情绪趋势时间序列                 |

### 9.3 Science / SDG / Climate / Satellite

| 路由                    | 方法   | 鉴权 | 作用                              |
| ----------------------- | ------ | ---- | --------------------------------- |
| `/api/science/articles` | `GET`  | 公共 | 文章同步数据（支持回退 mock）     |
| `/api/science/papers`   | `GET`  | 公共 | 论文同步数据（支持回退 mock）     |
| `/api/sdg/indicators`   | `GET`  | 公共 | World Bank 指标查询               |
| `/api/quiz/status`      | `GET`  | 登录 | 问答次数/状态                     |
| `/api/quiz/submit`      | `POST` | 登录 | 提交答题并发放积分                |
| `/api/climate/events`   | `GET`  | 公共 | 气候事件数据                      |
| `/api/satellites/tle`   | `GET`  | 公共 | CelesTrak + 缓存 + 传播后卫星数据 |

### 9.4 Points / Shop / Notifications / Game

| 路由                              | 方法          | 鉴权 | 作用                       |
| --------------------------------- | ------------- | ---- | -------------------------- |
| `/api/points`                     | `GET`         | 登录 | 查询积分、等级、购买记录   |
| `/api/points/sync-medals`         | `PUT`         | 登录 | 同步奖章积分               |
| `/api/points/award-medal`         | `POST/DELETE` | 登录 | 发放/撤销奖章积分          |
| `/api/shop/purchase`              | `POST`        | 登录 | 购买商品（模型/动作等）    |
| `/api/dances`                     | `GET`         | 登录 | 可用动作列表（含退款逻辑） |
| `/api/notifications`              | `GET/PATCH`   | 登录 | 通知读取与已读             |
| `/api/notifications/check-medals` | `POST`        | 登录 | 新奖章通知触发             |
| `/api/game/starter-skills`        | `GET/POST`    | 登录 | 初始技能与融合技能解锁数据 |

### 9.5 Admin

| 路由                       | 方法             | 鉴权   | 作用               |
| -------------------------- | ---------------- | ------ | ------------------ |
| `/api/admin/users`         | `GET/POST`       | 管理员 | 用户列表/新建      |
| `/api/admin/users/[id]`    | `GET/PUT/DELETE` | 管理员 | 用户详情/更新/删除 |
| `/api/admin/posts`         | `GET`            | 管理员 | 帖子审核列表       |
| `/api/admin/posts/[id]`    | `GET/PUT/DELETE` | 管理员 | 帖子管理           |
| `/api/admin/comments`      | `GET`            | 管理员 | 评论审核列表       |
| `/api/admin/comments/[id]` | `PUT/DELETE`     | 管理员 | 评论管理           |

## 10. 数据模型（Prisma）

`prisma/schema.prisma` 使用 SQLite，核心模型：

- `User`：账户、角色、积分、装备奖章
- `Post` / `Comment` / `Vote`：社区内容与投票
- `TrackedSatellite`：用户追踪卫星
- `TleCache`：TLE 缓存
- `SdgCache`：SDG 指标缓存
- `Notification`：站内通知
- `Purchase`：商店购买记录
- `ArticleCache` / `PaperCache`：科研同步缓存
- `QuizAttempt`：问答记录

## 11. OPS 游戏技术说明

### 11.1 运行架构

- `GameCanvas` 作为 UI 与引擎桥接层。
- `GameLoop` 以固定 tick 更新，渲染与逻辑分离。
- `GameState` 管理 player/enemy/bullet/pickup pools 与系统更新顺序。

### 11.2 性能策略

- 大量使用 `ObjectPool` 降低频繁分配导致的 GC 停顿。
- `SpatialHash` 降低碰撞检测复杂度。
- 画布尺寸与 CSS 像素一比一映射，减少缩放重采样成本。

### 11.3 敌人与难度

- `WaveManager` 基于时间和预算推进“常态刷怪 + 敌潮 + Boss”。
- 使用 `spawn budget`、`target active enemies`、`roster` 控制密度与类型。
- Boss 按间隔刷新并受 `bossHp` 缩放影响。

### 11.4 武器与升级

- 主动技能定义位于 `lib/game/weapons.ts`，每个技能包含多级参数：`damage/cooldown/projectiles/speed/range/pierce/aoe/special`。
- 被动定义在 `lib/game/upgrades.ts`。
- 升级候选由 `UpgradeSystem` 生成，支持 reroll。
- 融合技能定义在 `lib/game/synergies.ts`（当前已有 `Aegis Drone Constellation`）。

### 11.5 进度与解锁

- `starterProgress.ts` 管理开局可选技能、碎片消耗与按稀有度加权抽取。
- 游戏内通过 Boss 相关事件触发碎片获取，再在菜单侧执行解锁。

## 12. 样式系统

`src/app/globals.css` 提供统一设计体系：

- 深空主题色板（`--void-black`、`--panel-*`）
- 动态 accent 机制（`data-accent`）
- 玻璃态面板、扫描线、网格背景、发光文本
- 全局排版变量（Orbitron/Fira/Exo 字体）

## 13. 数据与脚本

| 文件                     | 作用                                   |
| ------------------------ | -------------------------------------- |
| `prisma/seed.ts`         | 初始化用户、帖子、评论、投票等测试数据 |
| `scripts/seedVotes.ts`   | 仅针对种子账号重建投票分布             |
| `docs/seed-accounts.md`  | 测试账号清单                           |
| `GAME_SKILLS_SUMMARY.md` | 游戏技能文档（独立于 README）          |

## 14. 开发建议与排障

### 14.1 常见问题

- `PrismaClientInitializationError`：确认 `.env` 的 `DATABASE_URL` 正确且可写。
- 登录态异常：检查 `JWT_SECRET` 与浏览器 cookie。
- 3D 页面空白：确认浏览器启用 WebGL，且 `public/textures` 资源存在。
- 游戏卡顿：检查浏览器性能模式、后台标签页状态和设备硬件加速。

### 14.2 建议开发流程

1. `pnpm install`
2. `pnpm db:migrate && pnpm db:seed`
3. `pnpm dev`
4. 开发前后执行 `pnpm lint`
5. 提交前执行 `pnpm build` 验证编译质量

## 15. 贡献规范

- 使用 Conventional Commits：`feat:` / `fix:` / `refactor:` / `docs:`
- UI 变更建议附截图或短视频
- 涉及 schema 的改动必须附 migration
- 不提交 `.env` 等敏感配置
