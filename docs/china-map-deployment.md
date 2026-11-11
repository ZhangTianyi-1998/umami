# 中国地图版本：构建与部署

网站概览、链接、像素及使用 WorldMap 的普通看板默认显示中国省级访客地图。点击省份进入地级市，支持返回全国。实时页面仍使用国家级世界地图，因为实时接口没有省市字段。

## 地图与统计

- 地图静态文件随 `public/maps/china` 一起发布，无需浏览器访问外部地图服务，无需地图 API Key。
- 省级支持 `CN-GD`、`CN-44` 等新旧 ISO 编码；城市通过中文和拼音别名匹配，并限制在当前省内。
- 直辖市暂不下钻，避免将城市访客重复计入各区。港澳台边界保留，当前省市统计仅统计 `country=CN`，这些区域显示“暂无定位数据”。
- IP 数据库没有城市、城市别名无法匹配时，地图不会凭空分配访客。因此各市之和可能低于省级总数。无需数据库迁移，历史记录已有的省市信息可以直接展示。
- 地图来源：[阿里云 DataV.GeoAtlas](https://datav.aliyun.com/portal/school/atlas/area_selector)，下载接口 `https://geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json`。文件下载于 2026-11-11，城市别名为离线生成的数据，可在 `src/lib/china-city-aliases.json` 补充供应商的名称变体。

## Docker 构建（推荐）

在 fork 的项目根目录运行：

```sh
docker compose -f docker-compose.yml -f docker-compose.china.yml build umami
docker compose -f docker-compose.yml -f docker-compose.china.yml up -d umami
```

覆盖配置会从当前源码构建 `umami-china:local`，而不是拉取官方镜像。数据库卷沿用原 Compose 配置。部署已有实例时，请继续使用原项目名称、数据库连接与密钥，先备份数据库。不要执行 `docker compose down -v`。

首次部署先修改主 Compose 文件中的 APP_SECRET、TWO_FACTOR_ENCRYPTION_KEY 和数据库密码。已有实例保留原密钥。容器启动会执行项目原有的数据库检查/迁移。

只构建镜像、传给另一台服务器：

```sh
docker build -t umami-china:local .
docker save -o umami-china.tar umami-china:local
# 将 tar 传到服务器后：
docker load -i umami-china.tar
docker compose -f docker-compose.yml -f docker-compose.china.yml up -d --no-build umami
```

源码修改需要提交到你自己的 fork；fork 不会自动更新官方镜像。若服务器使用独立 Compose 配置，将其中 Umami 的 image 改为 `umami-china:local`，保留原数据库、端口与环境变量。

## Node.js 构建

以仓库 `package.json` 的 engines 与 Dockerfile 为准：当前声明 pnpm 12.3.4，Docker 默认 Node 22.23.4。安装对应版本后：

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

构建前配置 `.env` 的 DATABASE_URL；完整 build 会检查数据库，并下载 GeoLite2 定位库，需网络和数据库可用。中国地图文件已在源码中，无需再次下载。生产服务默认端口 3000。

这不是纯静态站点，不能只上传 public 或 HTML。常规 Node 部署保留源码、运行依赖与构建产物；需要可搬运的单一包时优先使用上述 Docker 镜像。

## 本地模拟数据预览

开发服务启动后打开 `http://localhost:3000/map-preview`，无需登录。页面使用离线模拟省市数据，不请求统计接口、不写入数据库。省级模拟人数为下属城市人数之和，包含零访客城市。生产模式访问该路径返回 404。
`public/maps/china` 的 GeoJSON 已将外环调整为 D3 使用的顺时针方向，更新原始地图时需保持此约定。

地图默认显示中国，顶部“返回世界”可切到世界地图，再用“查看中国”返回。中国地图显示省名，下钻后显示城市名；世界地图显示中文国家名，滚轮放大后显示更多小国名称。区县尚未开放下钻与标注。

悬浮在地区或文字名称上会显示跟随鼠标的访客浮窗。省份点击进入城市地图；城市点击后在地图下方显示统计详情。世界地图点击中国区域或“中国”文字进入中国地图，其他国家点击显示国家统计。
