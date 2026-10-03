import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue({
      customElement: true,
      template: {
        compilerOptions: {
          // 自前カスタム要素の解釈
        }
      }
    }),
    dts({
      insertTypesEntry: true,
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'TollgateUI',
      fileName: (format) => `tollgate-ui.${format === 'es' ? 'js' : format + '.cjs'}`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      // 外部依存にしない（単体バンドルで即座に動くようにする）
      output: {
        exports: 'named',
        globals: {}
      }
    }
  }
})
