import { setGlobalDispatcher, Agent } from 'undici';
import SmeeClient from 'smee-client';
import { initGmailWatcher } from "./services/email_ggapi.js";
import dotenv from "dotenv";
dotenv.config();

// Undici global agent configuration
setGlobalDispatcher(
    new Agent({
        headersTimeout: 0, // TẮT timeout headers
        bodyTimeout: 0,
    })
);

// Connect to watch Gmail
// Smee Client setup để chuyển tiếp url từ smee.io về máy cục bộ
const smee = new SmeeClient({
    source: process.env.SMEE_CLIENT_URL,
    target: process.env.SMEE_TARGET_URL,
    logger: console
});

smee.start();

// Khởi động Gmail Watcher
await initGmailWatcher();