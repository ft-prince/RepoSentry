#!/usr/bin/env node
/**
 * RepoSentry MCP server.
 *
 * Default: stdio transport (for Claude Code, Cursor, and other local clients).
 * `--http` flag or MCP_TRANSPORT=http: Streamable HTTP transport on MCP_PORT
 * (default 3002) at POST /mcp — for remote/hosted use.
 */
import { createServer } from 'node:http'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { logger } from '@reposentry/core'
import { registerTools } from './tools.js'

const SERVER_INFO = { name: 'reposentry', version: '0.1.0' } as const

function buildServer(): McpServer {
  const server = new McpServer(SERVER_INFO, {
    instructions:
      'RepoSentry is an automated first-pass code reviewer. Use review_diff for local/uncommitted changes, review_pull_request for GitHub PRs on connected repos, list_recent_reviews for history, and explain_finding for a deep dive on one finding.',
  })
  registerTools(server)
  return server
}

async function runStdio(): Promise<void> {
  const server = buildServer()
  await server.connect(new StdioServerTransport())
  // No logging to stdout here — stdout IS the protocol channel.
  logger.info('mcp.stdio-ready', {})
}

async function runHttp(): Promise<void> {
  const port = Number(process.env.MCP_PORT ?? 3002)

  const httpServer = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, service: 'reposentry-mcp' }))
      return
    }
    if (url.pathname !== '/mcp') {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'not found' }))
      return
    }

    try {
      // Stateless mode: a fresh server+transport per request, no session ids.
      const server = buildServer()
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
      res.on('close', () => {
        void transport.close()
        void server.close()
      })
      await server.connect(transport)
      await transport.handleRequest(req, res)
    } catch (error) {
      logger.error('mcp.http-request-failed', { error: String(error) })
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: 'internal server error' }))
      }
    }
  })

  httpServer.listen(port, () => logger.info('mcp.http-listening', { port }))
}

const useHttp = process.argv.includes('--http') || process.env.MCP_TRANSPORT === 'http'

;(useHttp ? runHttp() : runStdio()).catch((error) => {
  logger.error('mcp.fatal', { error: String(error) })
  process.exit(1)
})
