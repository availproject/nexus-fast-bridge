import {
  Buffer as BufferShim,
  SlowBuffer as SlowBufferShim,
} from "vite-plugin-node-polyfills/shims/buffer";

const safeBuffer = {
  Buffer: BufferShim,
  SlowBuffer: SlowBufferShim,
};

export const Buffer = BufferShim;
export const SlowBuffer = SlowBufferShim;
export default safeBuffer;
