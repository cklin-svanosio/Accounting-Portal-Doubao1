import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      // 忽略 api 相關檔案（遠端殘留的 api/ 不會被打包讀取）
      external: file => file.includes('/api/')
    }
  }
})