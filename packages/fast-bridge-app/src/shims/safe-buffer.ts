import {
  Buffer as NodeBuffer,
  SlowBuffer as NodeSlowBuffer,
} from "node:buffer";

export const Buffer = NodeBuffer;
export const SlowBuffer = NodeSlowBuffer;

const safeBuffer = {
  Buffer,
  SlowBuffer,
};

export default safeBuffer;
