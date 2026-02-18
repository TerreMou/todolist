# Todo List (Neon + Netlify Functions)

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

## 生产部署（Sealos，推荐中国可访问）
本仓库已内置 `Dockerfile` 与 `server/index.js`，可直接容器化部署（静态页面 + API 一体化）。

### 1. 构建并推送镜像
先把镜像推到你可用的镜像仓库（Docker Hub / 阿里云 ACR / 腾讯 TCR 等）：

```bash
docker build -t <your-registry>/todo-master:latest .
docker push <your-registry>/todo-master:latest
```

### 2. 在 Sealos 部署应用
在 Sealos 控制台创建 Docker 应用，镜像填写上一步地址，配置：

- 容器端口：`3000`
- 环境变量：
  - `DATABASE_URL`（推荐填 Sealos 内置 PostgreSQL 连接串）
  - `MAGIC_KEY_HASH`（必填，建议）
  - `MAGIC_KEY`（可选，不推荐）

> 如果你在 Sealos 里创建了 PostgreSQL，可在数据库连接信息里复制连接串填到 `DATABASE_URL`。

### 3. 验证 API 与前端
部署完成后访问：

```bash
curl -i https://<your-sealos-domain>/.netlify/functions/state-get
```

- 返回 `401`：API 正常（只是未带密钥）
- 返回 `404`：应用路由未生效或不是这个镜像版本

然后浏览器打开 `https://<your-sealos-domain>` 进行正常使用。

## 本地旧数据迁移
应用启动时会自动执行：

- 远程为空 + 本地有数据 -> 调用 `state-migrate` 上传本地数据
- 远程有数据 -> 以远程数据为准并刷新本地缓存

## 开发注意
安装新增依赖：

```bash
npm install
```
