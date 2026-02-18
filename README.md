# Todo List (Neon + Netlify Functions)

## 1. 环境变量配置

### Netlify 后台（生产）
在 Netlify Site Settings -> Environment variables 添加：

- `NETLIFY_DATABASE_URL`: Netlify 集成 Neon 后通常自动注入
- `DATABASE_URL`: 可选；若设置，会优先于 `NETLIFY_DATABASE_URL`
- `MAGIC_KEY_HASH`: 推荐，密钥的 SHA-256 值
- `MAGIC_KEY`: 可选；仅在未设置 `MAGIC_KEY_HASH` 时使用明文

生成 `MAGIC_KEY_HASH` 示例：

```bash
node -e "console.log(require('crypto').createHash('sha256').update('你的超长随机密钥').digest('hex'))"
```

### 本地开发（建议）
在项目根目录创建 `.env.local`（不要提交）：

```bash
DATABASE_URL=你的数据库连接串
MAGIC_KEY=你的密钥
```

如果你只想本地模式（不连远程函数），可以不配这两个值。

## 2. 本地启动方式

### 前置要求
- Node.js: 建议 `22.12+`（或 `20.19+`）
- npm: 任意较新版本即可
- Netlify CLI: `npm i -g netlify-cli`

### 方式 A：仅前端页面（不跑 Netlify Functions）
```bash
npm install
npm run dev
```

- 访问 Vite 地址（通常 `http://localhost:5173`）
- 该模式下如果切到“云端自动同步”，会请求 `/.netlify/functions/*`，可能出现 `404`
- 适合做纯 UI/交互开发

### 方式 B：前端 + Netlify Functions（联调推荐）
```bash
npm install
netlify dev
```

- 访问 Netlify CLI 提供的地址（通常 `http://localhost:8888`）
- 该模式会同时代理前端和 `/.netlify/functions/*`
- 调试数据库读写、密钥校验、自动同步时必须使用该模式

## 3. Netlify CLI 发布部署

### 首次使用（一次即可）
```bash
netlify login
netlify link
```

### 正式发布
```bash
npm install
npm run build
netlify deploy --prod
```

建议在命令执行时确认：

- Publish directory 选择 `dist`
- Functions directory 选择 `netlify/functions`

注意：如果只手动拖 `dist` 到 Netlify，Functions 不会一起部署，`/.netlify/functions/*` 会返回 `404`。

## 4. 访问与密钥使用

1. 首次可用：`https://your-site.netlify.app/#key=你的密钥`
2. 前端会自动保存密钥，并清理 URL 里的 `#key`
3. 后续访问无需重复输入

若本地无密钥或密钥失效，页面会提示重新输入。

## 5. 数据接口

- `GET /.netlify/functions/state-get`
- `POST /.netlify/functions/state-save`
- `POST /.netlify/functions/state-migrate`
- `GET /.netlify/functions/auth-verify`

请求头均需携带：`x-magic-key`。

## 6. 本地旧数据迁移规则

应用启动时自动处理：

- 远程为空 + 本地有数据：调用 `state-migrate` 上传本地数据
- 远程有数据：以远程为准并刷新本地缓存（若冲突会弹窗选择）

## 7. 常见问题排查

### Q1: `/.netlify/functions/state-save` 返回 `404`
原因：你使用了 `npm run dev`（仅 Vite），没有运行 Functions。  
解决：改用 `netlify dev`，并访问 CLI 给出的地址（通常 `http://localhost:8888`）。

### Q2: `Could not resolve "@neondatabase/serverless"`
原因：本地依赖未正确安装。  
解决：

```bash
rm -rf node_modules package-lock.json
npm install
```

然后重新执行 `netlify dev`。

### Q3: 线上 `/.netlify/functions/*` 返回 `404`
原因：只部署了前端静态文件（如手动拖 `dist`），函数未部署。  
解决：使用 CLI 发布：

```bash
npm run build
netlify deploy --prod
```

并确认 Functions 目录为 `netlify/functions`。

### Q4: `500 Internal server error`
优先检查：
- Netlify 函数日志（确认数据库连接是否超时、密钥是否匹配）
- `DATABASE_URL` / `NETLIFY_DATABASE_URL` 是否有效
- `MAGIC_KEY_HASH` 或 `MAGIC_KEY` 是否与前端输入一致
