# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - Start local development server (runs on http://localhost:8787)
- `npm run deploy` - Deploy worker to Cloudflare
- `npm test` - Run all tests with Vitest
- `npm run cf-typegen` - Regenerate TypeScript types for Cloudflare bindings after updating wrangler.jsonc

To run a single test file:
```
npx vitest run test/index.spec.ts
```

To run tests in watch mode:
```
npx vitest
```

## Architecture

This is a Cloudflare Workers project using TypeScript.

- `src/index.ts` - Main worker entry point, exports a fetch handler
- `wrangler.jsonc` - Cloudflare Workers configuration (bindings, environment variables, etc.)
- `worker-configuration.d.ts` - Auto-generated types for the `Env` object (regenerate with `npm run cf-typegen`)
- `test/` - Vitest tests using `@cloudflare/vitest-pool-workers` for Workers runtime simulation

## Testing

Tests use `@cloudflare/vitest-pool-workers` which runs tests in the actual Workers runtime. Two testing styles are supported:

1. **Unit style**: Import the worker directly and call `worker.fetch()` with a mock context
2. **Integration style**: Use the `SELF` binding to make requests as if from the internet
