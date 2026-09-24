import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Live avatar token server (server/avatar-server.mjs) — keeps the API key off the client.
  // `port` reads $PORT so the dev-server launcher's autoPort assignment is honored;
  // without this Vite silently falls back to its own default (5173) instead.
  server: { port: Number(process.env.PORT) || 5176, proxy: { '/api': 'http://localhost:8787' } },
  optimizeDeps: {
    // Pre-bundle these together so TalkingHead and RealisticAvatar share one
    // copy of three.js (the avatar patches GLTFLoader to add meshopt support).
    include: [
      '@met4citizen/talkinghead/modules/talkinghead.mjs',
      '@met4citizen/talkinghead/modules/lipsync-en.mjs',
      'three',
      'three/addons/loaders/GLTFLoader.js',
      'three/addons/libs/meshopt_decoder.module.js',
    ],
  },
})
