import type { Plugin } from 'vite'
import type { ServerResponse } from 'node:http'
import type { ViteDevServer } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { runAuthLogin, runAuthPasswordChange } from './api/lib/authCore'
import { runFeedbackApi } from './api/lib/feedbackCore'

/** 与 boot 时一致：文件 env + 已在进程内的变量（部分终端只注入 process.env）。 */
function resolvePostgresUrlFromEnv(
  mode: string,
  envDir: string,
  loaded?: Record<string, string>,
): string | null {
  const e = loaded ?? loadEnv(mode, envDir, '')
  const raw =
    e.POSTGRES_URL ||
    e.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    ''
  const url = raw.trim()
  return url || null
}

function resolvePostgresUrlForServer(server: ViteDevServer): string | null {
  return resolvePostgresUrlFromEnv(server.config.mode, server.config.envDir)
}

function sendJson(res: ServerResponse, status: number, json: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(json))
}

/**
 * 存在 POSTGRES_URL / DATABASE_URL 时，在 Vite 内直连 Neon，便于本地验证入库（无需 vercel CLI）。
 * 若设置 VITE_API_PROXY_TARGET，则走代理，不启用本中间件。
 */
function viteFeedbackPostgresMiddleware(postgresUrl: string | null, proxyEnabled: boolean): Plugin {
  return {
    name: 'vite-feedback-postgres',
    enforce: 'pre',
    configureServer(server) {
      if (proxyEnabled) return
      if (!postgresUrl && !resolvePostgresUrlForServer(server)) return

      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        if (url !== '/api/feedback') {
          next()
          return
        }

        const method = req.method || 'GET'
        const resHttp = res as ServerResponse
        const postgresUrlLive = resolvePostgresUrlForServer(server)

        if (method === 'GET') {
          void (async () => {
            try {
              const out = await runFeedbackApi({
                method: 'GET',
                body: undefined,
                postgresUrl: postgresUrlLive,
              })
              sendJson(resHttp, out.status, out.json)
            } catch (e) {
              console.error('[vite-feedback GET]', e)
              const detail = e instanceof Error ? e.message : String(e)
              sendJson(resHttp, 500, {
                error: '反馈接口异常',
                ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
              })
            }
          })()
          return
        }

        if (method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', (c: Buffer) => {
            chunks.push(c)
          })
          req.on('end', () => {
            void (async () => {
              try {
                const raw = Buffer.concat(chunks).toString('utf8')
                let body: unknown
                try {
                  body = raw ? (JSON.parse(raw) as unknown) : null
                } catch {
                  body = null
                }
                const out = await runFeedbackApi({
                  method: 'POST',
                  body,
                  postgresUrl: resolvePostgresUrlForServer(server),
                })
                sendJson(resHttp, out.status, out.json)
              } catch (e) {
                console.error('[vite-feedback POST]', e)
                const detail = e instanceof Error ? e.message : String(e)
                sendJson(resHttp, 500, {
                  error: '反馈接口异常',
                  ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
                })
              }
            })()
          })
          return
        }

        sendJson(resHttp, 405, { error: 'Method Not Allowed' })
      })
    },
  }
}

function viteAuthPostgresMiddleware(postgresUrl: string | null, proxyEnabled: boolean): Plugin {
  return {
    name: 'vite-auth-postgres',
    enforce: 'pre',
    configureServer(server) {
      if (proxyEnabled) return
      if (!postgresUrl && !resolvePostgresUrlForServer(server)) return

      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        const method = req.method || 'GET'
        const resHttp = res as ServerResponse
        const postgresUrlLive = resolvePostgresUrlForServer(server)

        if (url === '/api/auth/login' && method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', (c: Buffer) => {
            chunks.push(c)
          })
          req.on('end', () => {
            void (async () => {
              try {
                const raw = Buffer.concat(chunks).toString('utf8')
                let body: unknown
                try {
                  body = raw ? (JSON.parse(raw) as unknown) : null
                } catch {
                  body = null
                }
                const out = await runAuthLogin({ body, postgresUrl: postgresUrlLive })
                sendJson(resHttp, out.status, out.json)
              } catch (e) {
                console.error('[vite-auth login]', e)
                const detail = e instanceof Error ? e.message : String(e)
                sendJson(resHttp, 500, {
                  error: '认证接口异常',
                  ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
                })
              }
            })()
          })
          return
        }

        if (url === '/api/auth/password' && method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', (c: Buffer) => {
            chunks.push(c)
          })
          req.on('end', () => {
            void (async () => {
              try {
                const raw = Buffer.concat(chunks).toString('utf8')
                let body: unknown
                try {
                  body = raw ? (JSON.parse(raw) as unknown) : null
                } catch {
                  body = null
                }
                const out = await runAuthPasswordChange({ body, postgresUrl: postgresUrlLive })
                sendJson(resHttp, out.status, out.json)
              } catch (e) {
                console.error('[vite-auth password]', e)
                const detail = e instanceof Error ? e.message : String(e)
                sendJson(resHttp, 500, {
                  error: '认证接口异常',
                  ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
                })
              }
            })()
          })
          return
        }

        next()
      })
    },
  }
}

function feedbackApiGuardWhenNoDb(proxyEnabled: boolean, postgresUrl: string | null): Plugin {
  return {
    name: 'feedback-api-guard',
    enforce: 'pre',
    configureServer(server) {
      if (proxyEnabled || postgresUrl) return
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        if (url.startsWith('/api/')) {
          const r = res as ServerResponse
          r.statusCode = 502
          r.setHeader('Content-Type', 'application/json; charset=utf-8')
          r.end(
            JSON.stringify({
              error:
                '本地未配置数据库：在项目根目录 .env.local 写入 POSTGRES_URL（可从 Vercel 控制台复制），或使用 VITE_API_PROXY_TARGET / npm run dev:vercel。',
            }),
          )
          return
        }
        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || ''
  const apiProxyEnabled = Boolean(apiTarget)
  const postgresUrl = !apiProxyEnabled
    ? resolvePostgresUrlFromEnv(mode, process.cwd(), env)
    : null

  return {
    plugins: [
      viteAuthPostgresMiddleware(postgresUrl, apiProxyEnabled),
      viteFeedbackPostgresMiddleware(postgresUrl, apiProxyEnabled),
      feedbackApiGuardWhenNoDb(apiProxyEnabled, postgresUrl),
      vue(),
    ],
    server: {
      proxy: apiProxyEnabled
        ? {
            '/api': {
              target: apiTarget.replace(/\/$/, ''),
              changeOrigin: true,
            },
          }
        : undefined,
    },
  }
})
