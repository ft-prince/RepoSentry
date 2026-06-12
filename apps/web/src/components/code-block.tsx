import { codeToHtml } from 'shiki'
import { CopyButton } from './copy-button'

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  sh: 'shellscript',
  yml: 'yaml',
  yaml: 'yaml',
  json: 'json',
  sql: 'sql',
  css: 'css',
  html: 'html',
  md: 'markdown',
}

export function langForFile(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return EXT_TO_LANG[ext] ?? 'text'
}

/** Server component: Shiki dual-theme highlight, copy button, quiet chrome. */
export async function CodeBlock({
  code,
  lang,
  label,
}: {
  code: string
  lang: string
  label?: string
}) {
  let html: string
  try {
    html = await codeToHtml(code, {
      lang,
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    })
  } catch {
    html = await codeToHtml(code, {
      lang: 'text',
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    })
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface-raised/50">
      <div className="flex h-7 items-center justify-between border-b border-border px-2.5">
        <span className="font-mono text-2xs text-faint">{label ?? lang}</span>
        <CopyButton text={code} />
      </div>
      <div
        className="overflow-x-auto p-3 font-mono text-xs leading-relaxed [&_pre]:!bg-transparent"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
