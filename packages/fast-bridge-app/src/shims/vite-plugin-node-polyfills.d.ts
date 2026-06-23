declare module "vite-plugin-node-polyfills/shims/buffer" {
  export { Buffer } from "buffer";

  export const SlowBuffer: (size: number) => import("buffer").Buffer;

  const defaultBuffer: typeof import("buffer").Buffer;
  export default defaultBuffer;
}
