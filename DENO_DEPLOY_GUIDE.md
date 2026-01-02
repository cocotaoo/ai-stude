# Deno Deploy 详细部署指南

## 前置准备

### 1. 项目配置检查

确保项目中包含以下文件：
- `deno.jsonc` - Deno 配置文件
- `tsconfig.json` - TypeScript 配置文件（moduleResolution 设为 Bundler）
- `.gitignore` - 包含 node_modules 和 dist 目录
- `package.json` - 包含构建脚本
- `vite.config.ts` - 已配置为兼容 Deno

### 2. 环境变量配置

在 Deno Deploy 控制台中添加以下环境变量：

| 变量名 | 描述 | 必要 |
|-------|------|------|
| `VITE_API_KEY` 或 `API_KEY` | 通用 API 密钥 | ✅ |
| `VITE_GEMINI_API_KEY` | Google Gemini 专用 API 密钥 | 按需 |

## 部署步骤

### 1. Fork 或创建 GitHub 仓库

将项目推送到 GitHub 仓库。

### 2. 登录 Deno Deploy

访问 [Deno Deploy](https://dash.deno.com) 并使用 GitHub 账号登录。

### 3. 创建新项目

1. 点击 "New Project"
2. 选择 "Deploy from GitHub"
3. 选择你的仓库
4. 选择要部署的分支（通常是 main 或 master）

### 4. 配置构建设置

| 设置项 | 值 |
|-------|-----|
| 构建命令 | `npm install && npm run build` |
| 输出目录 | `dist` |
| 环境 | 保持默认（Auto） |

### 5. 部署

点击 "Deploy" 按钮开始部署。

## 常见错误及解决方案

### 错误 1: 构建失败 - Module not found

**错误信息示例：**
```
Error: Cannot find module 'react' or its corresponding type declarations.
```

**解决方案：**
- 确保 `npm install` 命令已正确执行
- 检查 `package.json` 中是否包含所有必要依赖
- 尝试清理缓存：在项目根目录运行 `rm -rf node_modules package-lock.json && npm install`

### 错误 2: 构建失败 - TypeScript 错误

**错误信息示例：**
```
Error: Cannot find name 'process'.
```

**解决方案：**
- 确保 `vite.config.ts` 中已正确配置 `process.env` 替换
- 检查 `ai.ts` 文件中的环境变量访问方式是否正确
- 确保 TypeScript 配置中的 `moduleResolution` 设为 `Bundler`

### 错误 3: 运行时错误 - process is not defined

**错误信息示例：**
```
Uncaught ReferenceError: process is not defined
```

**解决方案：**
- 检查 `vite.config.ts` 中的 `define` 配置
- 确保所有代码中都使用 `import.meta.env` 或经过 Vite 处理的 `process.env`
- 检查 `ai.ts` 中的 `getEffectiveApiKey` 方法是否正确处理了环境变量

### 错误 4: API 调用失败 - API key not valid

**错误信息示例：**
```
API key not valid. Please pass a valid API key.
```

**解决方案：**
- 确保在 Deno Deploy 控制台中正确添加了环境变量
- 检查环境变量名称是否正确（区分大小写）
- 确保 API 密钥本身是有效的

### 错误 5: 部署成功但页面空白

**解决方案：**
- 检查浏览器控制台是否有 JavaScript 错误
- 检查网络请求是否成功
- 确保 `index.html` 文件中的资源路径正确
- 检查 `vite.config.ts` 中的 `base` 配置

## 调试技巧

### 1. 本地测试构建

在部署前，先在本地测试构建：

```bash
npm run build
# 本地预览构建结果
npm run preview
```

### 2. 查看 Deno Deploy 日志

在 Deno Deploy 控制台的 "Logs" 标签页中查看详细日志，定位错误原因。

### 3. 检查环境变量

在代码中添加调试信息，打印环境变量：

```typescript
console.log('Environment Variables:', {
  API_KEY: import.meta.env.API_KEY,
  VITE_API_KEY: import.meta.env.VITE_API_KEY,
  VITE_GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY
});
```

### 4. 使用 Deno 本地运行

```bash
# 安装 Deno
curl -fsSL https://deno.land/x/install/install.sh | sh

# 安装静态文件服务器
deno install -g --allow-net --allow-read https://deno.land/std@0.200.0/http/file_server.ts

# 运行构建后的应用
cd dist
file_server --port 8000
```

## 最佳实践

### 1. 使用环境变量前缀

统一使用 `VITE_` 前缀的环境变量，符合 Vite 标准：

```env
VITE_API_KEY=your-api-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

### 2. 避免硬编码

不要在代码中硬编码 API 密钥或其他敏感信息。

### 3. 测试不同环境

在开发、测试和生产环境中都进行测试，确保配置正确。

### 4. 定期更新依赖

定期更新项目依赖，确保使用最新版本的库和框架。

### 5. 使用 Deno 配置文件

为 Deno 环境创建专门的 `deno.jsonc` 配置文件，与 Node.js 环境分离。

## 常见问题解答

### Q: Deno Deploy 支持哪些构建命令？
A: Deno Deploy 支持常见的 Node.js 构建命令，如 `npm run build`、`yarn build`、`pnpm build` 等。

### Q: 如何访问 Deno Deploy 上的环境变量？
A: 使用 `import.meta.env.VAR_NAME` 或 `Deno.env.get('VAR_NAME')`（在服务器端）。

### Q: 为什么我的 API 密钥在 Deno Deploy 上不生效？
A: 请检查：
- 环境变量名称是否正确（区分大小写）
- 环境变量是否添加到了正确的项目中
- 构建命令是否正确执行
- 代码中是否正确访问了环境变量

### Q: 如何在 Deno Deploy 上使用自定义域名？
A: 在 Deno Deploy 控制台的 "Domains" 标签页中添加自定义域名，并按照提示配置 DNS。

## 资源链接

- [Deno Deploy 官方文档](https://deno.com/deploy/docs)
- [Vite 官方文档](https://vitejs.dev/guide/)
- [Deno 官方文档](https://deno.land/manual)
- [React 官方文档](https://react.dev/learn)

## 联系方式

如果遇到无法解决的问题，可以：
1. 查看 Deno Deploy 社区 [Discord](https://discord.gg/deno)
2. 提交 Issue 到项目仓库
3. 联系 Deno Deploy 支持团队

---

通过遵循本指南，您应该能够成功在 Deno Deploy 上部署 AI Scholar 应用。如果遇到任何问题，请参考常见错误及解决方案部分，或查看详细的日志信息。