
import { fileURLToPath, URL } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'process';

export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    const env = loadEnv(mode, process.cwd(), '');
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY),
      },
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('.', import.meta.url)),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'esbuild',
        rollupOptions: {
          // Tell Vite/Rollup that these packages are provided by the browser (via Import Map)
          // and should not be bundled into the final build.
          external: [
            '@supabase/supabase-js',
            '@google/genai',
            'react',
            'react-dom',
            'react-dom/client'
          ],
          output: {
            globals: {
              'react': 'React',
              'react-dom': 'ReactDOM',
              '@supabase/supabase-js': 'supabase',
              '@google/genai': 'googleGenai'
            }
          }
        }
      }
    };
});
