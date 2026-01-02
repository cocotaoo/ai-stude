
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// 简单的Vite配置，只保留必要的设置
export default defineConfig(({ mode }) => {
  // Load environment variables from .env files
  const env = loadEnv(mode, process.cwd(), '');
  
  // 构建环境变量对象，支持多种前缀
  const envVars = {
    // 保留原有API_KEY支持，兼容现有代码
    API_KEY: env.API_KEY || env.VITE_API_KEY || "",
    SITE_PASSWORD: env.SITE_PASSWORD || env.VITE_SITE_PASSWORD || "",
    // 支持Vite标准前缀
    VITE_API_KEY: env.VITE_API_KEY || env.API_KEY || "",
    VITE_GEMINI_API_KEY: env.VITE_GEMINI_API_KEY || "",
    // 添加其他可能需要的环境变量
    NODE_ENV: mode
  };
  
  return {
    plugins: [react()],
    define: {
      // 1. 替换代码中的process.env为静态对象，兼容Deno
      'process.env': JSON.stringify(envVars),
      'process.browser': true,
      // 2. 直接定义import.meta.env，支持Vite标准
      'import.meta.env': JSON.stringify(envVars)
    },
    server: {
      open: true,
      port: 5173
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
      emptyOutDir: true
    }
  };
});
