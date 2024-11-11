interface CryptoPayConfig {
  apiToken: string;
  apiEndpoint: string;
  appUrl: string;
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

interface WebhookUpdate {
  update_type: string;
  update_id: number;
  request_date: string;
  payload: Invoice;
}
