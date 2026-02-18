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
3. 之后访问无需重复输入

若本地没有密钥或密钥失效，页面会弹出密钥输入层。

## 数据接口
- `GET /.netlify/functions/state-get`
- `POST /.netlify/functions/state-save`
- `POST /.netlify/functions/state-migrate`
- `GET /.netlify/functions/auth-verify`

所有接口都要求请求头：`x-magic-key`。

## 本地旧数据迁移
应用启动时会自动执行：

- 远程为空 + 本地有数据 -> 调用 `state-migrate` 上传本地数据
- 远程有数据 -> 以远程数据为准并刷新本地缓存

## 开发注意
安装新增依赖：

```bash
npm install
```
