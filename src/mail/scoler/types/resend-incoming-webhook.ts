export type ResendIncomingWebhookPayload = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    from?: string;
    to?: string[];
    bcc?: string[];
    cc?: string[];
    message_id?: string;
    subject?: string;
    attachments?: Array<{
      id?: string;
      filename?: string;
      content_type?: string;
      content_disposition?: string | null;
      content_id?: string | null;
      size?: number;
    }>;
  };
};
