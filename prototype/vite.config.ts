import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Le build produit un seul fichier dist/index.html, facile à partager.
export default defineConfig({ plugins: [react(), viteSingleFile()] })
