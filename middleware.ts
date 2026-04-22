// Next.js requires middleware to live in middleware.ts at the project root.
// All logic lives in proxy.ts so it can be imported and unit-tested
// independently of the Next.js middleware contract.
export { proxy as middleware, config } from "./proxy";
