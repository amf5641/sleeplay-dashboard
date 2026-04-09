import { NextRequest } from "next/server";
import crypto from "crypto";

// ── Env vars ─────────────────────────────────────────────────────────────────
const WESPER_API_KEY_BASE64 = process.env.WESPER_API_KEY_BASE64!;
const WESPER_API_URL = process.env.WESPER_API_URL ?? "https://api.wesper.dev/v1/external-orders/sleeplay";
const WESPER_GROUP_ID = process.env.WESPER_GROUP_ID!;           // supplied by Wesper onboarding
const WESPER_SKU = process.env.WESPER_SKU!;                     // supplied by Wesper onboarding
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET!;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!; // e.g. sleeplay.myshopify.com
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!; // Admin API access token
// Order metafield that stores date of birth — format: "namespace.key"
const BIRTHDAY_METAFIELD_KEY = process.env.BIRTHDAY_METAFIELD_KEY ?? "checkoutblocks.date_of_birth";
// Tag that identifies a Wesper order
const WESPER_ORDER_TAG = (process.env.WESPER_ORDER_TAG ?? "wesper").toLowerCase();

// ── HMAC verification ─────────────────────────────────────────────────────────
function verifyShopifyHmac(rawBody: string, hmacHeader: string | null): boolean {
  if (!hmacHeader || !SHOPIFY_WEBHOOK_SECRET) return false;
  const digest = crypto
    .createHmac("sha256", SHOPIFY_WEBHOOK_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

// ── Fetch date of birth from Shopify order metafields ────────────────────────
async function fetchOrderDateOfBirth(orderId: number): Promise<string> {
  const [namespace, key] = BIRTHDAY_METAFIELD_KEY.split(".");
  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/orders/${orderId}/metafields.json?namespace=${namespace}&key=${key}`;

  try {
    const res = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return "";
    const data = await res.json() as { metafields?: { value?: string }[] };
    // Shopify date metafields are already YYYY-MM-DD — matches Wesper's expected format
    return data.metafields?.[0]?.value ?? "";
  } catch {
    return "";
  }
}

// ── Shopify order types (minimal) ─────────────────────────────────────────────
interface ShopifyAddress {
  first_name?: string;
  last_name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province_code?: string;
  zip?: string;
  country_code?: string;
  phone?: string;
}

interface ShopifyOrder {
  id: number;
  email?: string;
  created_at: string;
  tags?: string;
  phone?: string;
  customer?: {
    id: number;
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
  };
  shipping_address?: ShopifyAddress;
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // 1. Read raw body (needed for HMAC verification)
  const rawBody = await request.text();

  // 2. Verify Shopify HMAC signature
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  if (!verifyShopifyHmac(rawBody, hmacHeader)) {
    console.warn("Wesper webhook: invalid Shopify HMAC signature");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Parse payload
  let order: ShopifyOrder;
  try {
    order = JSON.parse(rawBody) as ShopifyOrder;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 4. Only forward orders tagged as Wesper orders
  const orderTags = (order.tags ?? "").toLowerCase().split(",").map((t) => t.trim());
  if (!orderTags.includes(WESPER_ORDER_TAG)) {
    return Response.json({ skipped: true, reason: "Not a Wesper order" });
  }

  // 5. Fetch date of birth from order metafields
  const customer = order.customer;
  const birthDate = await fetchOrderDateOfBirth(order.id);

  // 6. Map Shopify → Wesper payload
  const addr = order.shipping_address ?? {};
  const patientPhone = addr.phone ?? order.phone ?? customer?.phone ?? "";
  const patientEmail = order.email ?? customer?.email ?? "";

  const wesperPayload = {
    interpreting_provider: {
      group_id: WESPER_GROUP_ID,
      name: "Sleeplay",
      email: "orders@sleeplay.com",
    },
    referring_provider: {
      name: "Sleeplay",
      email: "orders@sleeplay.com",
    },
    order: {
      order_id: String(order.id),
      sku: WESPER_SKU,
      date: order.created_at,
    },
    patient: {
      mrn: customer ? String(customer.id) : String(order.id),
      first_name: addr.first_name ?? customer?.first_name ?? "",
      last_name: addr.last_name ?? customer?.last_name ?? "",
      gender: "",       // not collected at checkout
      birth_date: birthDate,
      shipping_address_one: addr.address1 ?? "",
      shipping_address_two: addr.address2 ?? "",
      shipping_city: addr.city ?? "",
      shipping_state: addr.province_code ?? "",
      shipping_zip: addr.zip ?? "",
      shipping_country: addr.country_code ?? "USA",
      phone: patientPhone,
      email: patientEmail,
    },
    Insurance: {},
    Clinical: {},
  };

  // 7. POST to Wesper
  let wesperRes: Response;
  try {
    wesperRes = await fetch(WESPER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${WESPER_API_KEY_BASE64}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(wesperPayload),
    });
  } catch (err) {
    console.error("Wesper API network error:", err);
    return Response.json({ error: "Failed to reach Wesper API" }, { status: 502 });
  }

  if (!wesperRes.ok) {
    const errorBody = await wesperRes.text();
    console.error(`Wesper API error ${wesperRes.status}:`, errorBody);
    return Response.json(
      { error: `Wesper API returned ${wesperRes.status}`, detail: errorBody },
      { status: 502 }
    );
  }

  console.log(`Wesper order submitted: Shopify order ${order.id}, customer ${customer?.id}`);
  return Response.json({ success: true, shopifyOrderId: order.id });
}
