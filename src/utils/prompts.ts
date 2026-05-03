export function buildCorpus(files: Array<{ path: string; content: string }>): string {
  return files
    .map(({ path, content }) => `<file path="${path}">\n${content}\n</file>`)
    .join('\n\n');
}

export const SYSTEM_BULK_READ = `You are a precise code analyst. Read the provided files and answer the question concisely in Markdown. Cite file paths when relevant. Do not add commentary beyond what was asked.`;

export const SYSTEM_WRITE_DOCS = `You are a technical writer. Generate clear, accurate documentation based on the provided code and instruction. Output only the documentation content — no preamble, no explanation of what you are doing.`;

export const SYSTEM_WRITE_BOILERPLATE = `You are a senior software engineer. Generate the requested boilerplate code that matches the style and patterns of any reference files provided. Output only the code — no preamble, no markdown fences unless the target file is Markdown.`;
