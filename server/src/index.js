import { createApp } from "./app.js";
import { initializeRuntime } from "./runtime.js";

// Vercel detects this default Express export when `server` is configured as
// the project's Root Directory. Do not call app.listen() in this module.
export default createApp({ initialize: initializeRuntime });
