# Deno 部署说明

## 环境要求

- Deno 1.30+（推荐最新稳定版）
- Vite 5+（项目已包含）

## 构建步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 构建生产版本

```bash
npm run build
```

构建后的文件将生成在 `dist` 目录中。

### 3. 配置环境变量

创建 `.env` 或 `.env.local` 文件，添加所需的环境变量：

```env
# API 密钥配置（二选一或同时配置）
API_KEY=your-api-key
VITE_API_KEY=your-api-key
VITE_GEMINI_API_KEY=your-gemini-api-key

# 其他可选配置
SITE_PASSWORD=optional-site-password
```

## Deno 部署方案

### 方案 1: 使用 Deno Deploy

1. **登录 Deno Deploy**
   - 访问 https://dash.deno.com
   - 使用 GitHub 账号登录

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub"
   - 选择你的仓库

3. **配置构建设置**
   - 构建命令：`npm install && npm run build`
   - 输出目录：`dist`

4. **添加环境变量**
   - 在项目设置中添加所需的环境变量
   - 变量名与 `.env` 文件中的一致

5. **部署**
   - 点击 "Deploy"
   - 等待部署完成

### 方案 2: 使用 Deno 本地运行

1. **安装 Deno**
   - Windows: `iwr https://deno.land/x/install/install.ps1 -useb | iex`
   - macOS/Linux: `curl -fsSL https://deno.land/x/install/install.sh | sh`

2. **安装 Serve 工具**
   ```bash
deno install -g --allow-net --allow-read https://deno.land/std@0.200.0/http/file_server.ts
   ```

3. **运行构建后的应用**
   ```bash
   cd dist
   file_server --port 8000
   ```

4. **访问应用**
   - 打开浏览器访问：http://localhost:8000

### 方案 3: 使用 Deno 自定义服务器

创建 `deno-server.ts` 文件：

```typescript
import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.200.0/http/file_server.ts";

// 读取环境变量
const env = {
  API_KEY: Deno.env.get("API_KEY") || Deno.env.get("VITE_API_KEY") || "",
  VITE_GEMINI_API_KEY: Deno.env.get("VITE_GEMINI_API_KEY") || "",
  NODE_ENV: "production"
};

serve((req) => {
  const url = new URL(req.url);
  
  // 为 API 请求添加环境变量头
  if (url.pathname.startsWith("/api")) {
    // 处理 API 请求
    return new Response(JSON.stringify({ message: "API is working" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  
  // 静态文件服务
  return serveDir(req, {
    fsRoot: "./dist",
    showDirListings: true,
  });
});

console.log("Server running at http://localhost:8000");
```

运行服务器：

```bash
deno run --allow-net --allow-read --allow-env deno-server.ts
```

## 环境变量说明

| 变量名 | 描述 | 类型 |
|-------|------|------|
| `API_KEY` | 通用 API 密钥（兼容旧版本） | 字符串 |
| `VITE_API_KEY` | 通用 API 密钥（Vite 标准） | 字符串 |
| `VITE_GEMINI_API_KEY` | Google Gemini 专用 API 密钥 | 字符串 |
| `SITE_PASSWORD` | 站点密码（可选） | 字符串 |
| `NODE_ENV` | 运行环境 | `development` 或 `production` |

## 常见问题

### 1. 环境变量不生效

- 确保环境变量名称正确（区分大小写）
- 检查 `.env` 文件是否在项目根目录
- 重启开发服务器或重新构建

### 2. Deno 部署时找不到模块

- 确保所有依赖都已正确安装
- 检查 `vite.config.ts` 中的构建配置
- 尝试使用不同的构建目标

### 3. API 调用失败

- 检查 API 密钥是否正确
- 确保网络连接正常
- 检查 API 提供商的服务状态

## 开发模式

在 Deno 环境中开发：

```bash
npm run dev
```

## 注意事项

1. Deno 环境中没有 `window` 对象，代码中已做兼容处理
2. 所有环境变量访问都添加了容错机制
3. 支持多种环境变量访问方式：`process.env`、`import.meta.env`、`globalThis.env`
4. 构建后的文件是静态的，可以部署到任何静态文件服务器

## 调试技巧

1. 查看构建日志，检查是否有错误
2. 检查浏览器控制台，查看运行时错误
3. 使用 `deno check deno-server.ts` 检查 TypeScript 类型
4. 使用 `DENO_ENV=production deno run ...` 设置环境变量

## 相关链接

- [Deno 官方文档](https://deno.land/manual)
- [Deno Deploy](https://dash.deno.com)
- [Vite 官方文档](https://vitejs.dev/guide/)
- [React 官方文档](https://react.dev/learn)