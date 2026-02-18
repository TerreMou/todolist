# Todo List (CloudBase Ready)

## 环境变量（Netlify）
在 Netlify Site Settings -> Environment variables 添加：

- `NETLIFY_DATABASE_URL`: Netlify 集成 Neon 后会自动注入（可直接使用）
- `DATABASE_URL`: 可选。若你手动配置了该变量，会优先使用
- `MAGIC_KEY_HASH`: 你的密钥 SHA-256（推荐）
- `MAGIC_KEY`: 可选，若未设置 `MAGIC_KEY_HASH` 时可用明文密钥（不推荐）

生成 `MAGIC_KEY_HASH` 示例：

```bash
node -e "console.log(require('crypto').createHash('sha256').update('你的超长随机密钥').digest('hex'))"
```

## 使用方式
1. 第一次访问可使用：`https://your-site.netlify.app/#key=你的密钥`
2. 前端会自动把密钥写入本地并清理 URL 中的 `#key`
3. 之后访问无需重复输入，可在右上角钥匙按钮里切换本地/云端模式

## 数据接口
- `GET /.netlify/functions/state-get`
- `POST /.netlify/functions/state-save`
- `POST /.netlify/functions/state-migrate`
- `GET /.netlify/functions/auth-verify`

所有接口都要求请求头：`x-magic-key`。

## 生产部署（Netlify CLI）
不要再手动拖 `dist` 目录发布；那样不会部署 Functions。

首次仅需执行一次：

```bash
npm i -g netlify-cli
netlify login
netlify link
```

之后每次发布只需要：

```bash
netlify deploy --prod
```

发布后验证函数是否在线：

```bash
curl -i https://your-site.netlify.app/.netlify/functions/state-get
```

返回 `401` 表示正常（函数已部署，未带密钥所以拒绝访问）；如果是 `404` 说明函数未部署成功。

## 生产部署（腾讯云 CloudBase）
本仓库已内置 `Dockerfile` 与 `server/index.js`，采用“前端静态资源 + Node API 一体化”方式部署。
服务端数据库驱动使用 `pg`，可直接连接 CloudBase / 腾讯云 PostgreSQL。

### 1. 推送代码到远端分支
当前建议分支：`feat/cloudbase-deploy`

```bash
git push -u origin feat/cloudbase-deploy
```

### 2. 在 CloudBase 新建云托管服务
建议使用 CloudBase Run（云托管）并选择“从代码仓库部署”或“上传代码包”。

- 运行环境：Node.js 容器（按仓库 `Dockerfile` 构建）
- 容器端口：`3000`
- 启动命令：默认（`npm run start`，已在 Dockerfile/脚本配置）

### 3. 配置环境变量（必须）
- `DATABASE_URL`：CloudBase / 腾讯云 PostgreSQL 连接串
- `MAGIC_KEY_HASH`：你的密钥 SHA-256（推荐）
- `MAGIC_KEY`：可选，不推荐

### 4. 发布并验证
部署完成后先测 API：

```bash
curl -i https://<your-cloudbase-domain>/.netlify/functions/state-get
```

- 返回 `401`：API 正常（未带密钥，被鉴权拦截）
- 返回 `404`：服务路由未生效或部署版本不对

再在浏览器访问：

```text
https://<your-cloudbase-domain>/#key=你的明文密钥
```

首次可自动写入密钥并完成本地/远程初始化。

## 本地旧数据迁移
应用启动时会自动执行：

- 远程为空 + 本地有数据 -> 调用 `state-migrate` 上传本地数据
- 远程有数据 -> 以远程数据为准并刷新本地缓存

## 开发注意
安装新增依赖：

```bash
npm install
```
