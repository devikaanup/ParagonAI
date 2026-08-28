import { defineConfig } from 'vite';
import { resolve } from 'path';
import { handler } from './netlify/functions/api.js';

export default defineConfig({
  root: __dirname,
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  plugins: [
    {
      name: 'api-server-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url.startsWith('/api')) {
            const buffers = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            const bodyString = Buffer.concat(buffers).toString();

            const event = {
              httpMethod: req.method,
              path: req.url.split('?')[0],
              headers: req.headers,
              queryStringParameters: Object.fromEntries(new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams),
              body: bodyString
            };

            try {
              const result = await handler(event, {});
              res.statusCode = result.statusCode;
              for (const [key, value] of Object.entries(result.headers || {})) {
                res.setHeader(key, value);
              }
              res.end(result.body);
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }
          next();
        });
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        run: resolve(__dirname, 'run.html'),
        agents: resolve(__dirname, 'agents.html'),
        howItWorks: resolve(__dirname, 'how-it-works.html')
      }
    }
  }
});
