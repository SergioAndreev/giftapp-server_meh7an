import crypto from "crypto";

interface ApiHeaders extends Record<string, string> {
  "Crypto-Pay-API-Token": string;
  "Content-Type": string;
}

interface GiftData {
  id: string;
  name: string;
  price: number;
  currency: string;
}

interface Invoice {
  invoice_id: number;
  bot_invoice_url: string;
  web_app_invoice_url: string;
  mini_app_invoice_url: string;
  status: string;
  hash: string;
  payload?: string;
  amount: string;
  paid_at?: string;
  paid_anonymously?: boolean;
  comment?: string;
}

interface ApiResponse<T> {
  ok: boolean;
  error?: string;
  result: T;
}

interface WebhookUpdate {
  update_type: string;
  update_id: number;
  request_date: string;
  payload: Invoice;
}

interface PaymentResponse {
  paymentUrl: string;
  webAppUrl: string;
  miniAppUrl: string;
  invoiceId: number;
}

interface WebhookRequest {
  headers: {
    [key: string]: string | undefined;
  };
  body: unknown;
}

interface WebhookResponse {
  status: (code: number) => WebhookResponse;
  json: (data: unknown) => void;
  send: (data: string) => void;
}

const CRYPTO_PAY_API_TOKEN = process.env.CRYPTOPAY_API_KEY as string;
const API_BASE_URL = process.env.CRYPTOPAY_API_ENDPOINT as string;

if (!CRYPTO_PAY_API_TOKEN || !API_BASE_URL) {
  throw new Error("Missing required environment variables");
}

export class CryptoPayService {
  private readonly headers: ApiHeaders;

  constructor() {
    this.headers = {
      "Crypto-Pay-API-Token": CRYPTO_PAY_API_TOKEN!,
      "Content-Type": "application/json",
    };
  }

  async createGiftInvoice(giftData: GiftData): Promise<Invoice> {
    try {
      const response = await fetch(`${API_BASE_URL}/createInvoice`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          currency_type: "crypto",
          asset: giftData.currency,
          accepted_assets: "USDT,TON,BTC,ETH",
          amount: giftData.price.toString(),
          description: `Purchasing a ${giftData.name} gift`,
          payload: `gift_id_${giftData.id}`,
          expires_in: 3600,
          paid_btn_name: "close",
          // paid_btn_url: `${process.env.APP_URL}/gifts/${giftData.id}`,
          allow_comments: true,
          allow_anonymous: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<Invoice> = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Unknown error occurred");
      }

      return data.result;
    } catch (error) {
      console.error("Error creating invoice:", error);
      throw error instanceof Error
        ? error
        : new Error("Unknown error occurred");
    }
  }

  handleWebhook(req: WebhookRequest, res: WebhookResponse): void {
    try {
      const signature = req.headers["crypto-pay-api-signature"];

      if (typeof signature !== "string") {
        res.status(401).json({ error: "Missing signature" });
        return;
      }

      if (!this.verifySignature(signature, req.body)) {
        res.status(401).json({ error: "Invalid signature" });
        return;
      }

      const update = req.body as WebhookUpdate;

      if (update.update_type === "invoice_paid") {
        const invoice = update.payload;
        const giftId = invoice.payload?.split("gift_id_")[1];

        if (giftId) {
          this.updateGiftPaymentStatus(giftId, invoice).catch((error) => {
            console.error("Error updating gift payment status:", error);
            res.status(500).json({ error: "Failed to update payment status" });
          });
        }
      }

      res.status(200).json({ status: "OK" });
    } catch (error) {
      console.error("Webhook handling error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private verifySignature(signature: string, body: unknown): boolean {
    try {
      const secret = crypto
        .createHash("sha256")
        .update(CRYPTO_PAY_API_TOKEN)
        .digest();

      const checkString = JSON.stringify(body);
      const hmac = crypto
        .createHmac("sha256", secret)
        .update(checkString)
        .digest("hex");

      return hmac === signature;
    } catch (error) {
      console.error("Signature verification error:", error);
      return false;
    }
  }

  async updateGiftPaymentStatus(
    giftId: string,
    invoice: Invoice
  ): Promise<void> {
    console.log(`Updating payment status for gift ${giftId}`, invoice);
  }

  async processGiftPurchase(giftData: GiftData): Promise<PaymentResponse> {
    try {
      const invoice = await this.createGiftInvoice(giftData);

      return {
        paymentUrl: invoice.bot_invoice_url,
        webAppUrl: invoice.web_app_invoice_url,
        miniAppUrl: invoice.mini_app_invoice_url,
        invoiceId: invoice.invoice_id,
      };
    } catch (error) {
      console.error("Error processing gift purchase:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to process gift purchase");
    }
  }
}
