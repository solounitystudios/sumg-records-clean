// Next.js requires the middleware entry point to be at middleware.ts (root or src/).
// The implementation lives in proxy.ts; we re-export it here under the required names.
export { proxy as middleware, config } from "./proxy";
