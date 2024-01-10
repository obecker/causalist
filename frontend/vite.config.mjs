import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig(() => {

    const leadingZero = (v) => v.toString().padStart(2, '0');
    const today = new Date();
    const buildNo = `v${today.getFullYear()}${leadingZero(today.getMonth()+1)}${leadingZero(today.getDate())}`

    return {
        build: {
            outDir: 'build',
        },
        plugins: [react()],
        server: {
            host: true, // make the server accessible in the local network
            port: 3000,
            strictPort: true,
            open: true,
            proxy: {
                '/api': 'http://localhost:9000'
            }
        },
        define: {
            BUILD_NUMBER: JSON.stringify(buildNo)
        }
    };
});
