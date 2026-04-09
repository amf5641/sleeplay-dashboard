/**
 * Run once after deploying to register the Shopify webhook for Wesper orders.
 * Usage: node scripts/register-wesper-webhook.mjs
 *
 * Requires these env vars (from .env or set in terminal):
 *   SHOPIFY_STORE_DOMAIN   e.g. sleeplay.myshopify.com
 *   SHOPIFY_ACCESS_TOKEN   Admin API access token
 *   WEBHOOK_CALLBACK_URL   e.g. https://your-dashboard.vercel.app/api/shopify/wesper
 */

import * as dotenv from "dotenv";
dotenv.config();

const { SHOPIFY_STORE_DOMAIN, SHOPIFY_ACCESS_TOKEN, WEBHOOK_CALLBACK_URL } = process.env;

if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ACCESS_TOKEN || !WEBHOOK_CALLBACK_URL) {
  console.error("Missing required env vars: SHOPIFY_STORE_DOMAIN, SHOPIFY_ACCESS_TOKEN, WEBHOOK_CALLBACK_URL");
  process.exit(1);
}

const res = await fetch(
  `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/webhooks.json`,
  {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      webhook: {
        topic: "orders/paid",
        address: WEBHOOK_CALLBACK_URL,
        format: "json",
      },
    }),
  }
);

const data = await res.json();

if (!res.ok) {
  console.error("Failed to register webhook:", JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log("Webhook registered successfully!");
console.log("ID:", data.webhook.id);
console.log("Topic:", data.webhook.topic);
console.log("Address:", data.webhook.address);
console.log("\nNow copy the signing secret from Shopify Admin > Settings > Notifications > Webhooks");
console.log("and paste it into your .env as SHOPIFY_WEBHOOK_SECRET");
