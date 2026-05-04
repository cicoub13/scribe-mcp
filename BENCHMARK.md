# Benchmark — Scribe MCP vs alternatives

## Context

This benchmark compares the token and dollar cost of three approaches to answer the same prompt on a third-party GitHub repository, using [Claude Code](https://claude.ai/code).

**Prompt tested:** *"Summarize this project and write a table report in a MD file"*
**Target repository:** [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)

### Approaches compared

| Approach | Description |
|---|---|
| **Claude Only** | Claude Code reads files directly, with no third-party tool |
| **Claude + [Serena](https://github.com/oraios/serena)** | Serena provides a semantic index of the repository (onboarding already performed) |
| **Claude + Scribe MCP** | [Scribe MCP](.) compresses and aggregates files before sending them to Claude |

---

## Results

| Metric | Claude Only | Claude + Serena | Claude + Scribe MCP |
|---|---:|---:|---:|
| Input tokens | 17 | 2,034 | 24 |
| Output tokens | 5,769 | 3,708 | 3,428 |
| Cache creation tokens | 54,385 | 46,918 | 49,465 |
| Cache read tokens | 208,469 | 175,952 | 228,710 |
| **Total cost** | **$0.353** | **$0.290** | **$0.306** |

---

## Observations

- **Scribe MCP** significantly reduces output tokens (−41 % vs Claude Only), indicating that Claude produces more concise responses thanks to a pre-structured context.
- **Serena** achieves the lowest cost through its semantic index, but requires a one-time onboarding step per repository.
- **Scribe MCP** requires no prior setup and works immediately on any repository.
