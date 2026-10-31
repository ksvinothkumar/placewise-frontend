import { http } from '../http';

export interface IntegrationsStatus {
  email?: { configured: boolean; from?: string; host?: string };
  ai?: { enabled: boolean; model?: string };
  careers?: { published: number };
}
export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  last?: { ok: boolean } | null;
  /** only returned by create */
  secret?: string;
}
export interface WebhookList {
  items: Webhook[];
  /** event names a webhook can subscribe to */
  events: string[];
}
export interface WebhookInput {
  name: string;
  url: string;
  events: string[];
}
export interface WebhookDelivery {
  id: string;
  event: string;
  ok: boolean;
  statusCode?: number;
  error?: string;
  attempt?: number;
  durationMs: number;
  createdAt: string;
}
export interface TestEmailResult {
  status: 'sent' | 'simulated' | 'failed';
  to?: string;
  error?: string;
}
export interface WebhookTestResult {
  ok: boolean;
  statusCode?: number;
  error?: string;
}

export const integrationsApi = {
  status: () => http.get<IntegrationsStatus>('/integrations'),
  testEmail: () => http.post<TestEmailResult>('/integrations/test-email', {}),
};

export const webhooksApi = {
  base: '/webhooks',
  list: () => http.get<WebhookList>('/webhooks'),
  create: (body: WebhookInput) => http.post<Webhook>('/webhooks', body),
  update: (id: string, body: Partial<WebhookInput> & { active?: boolean }) => http.put<Webhook>(`/webhooks/${id}`, body),
  remove: (id: string) => http.delete<unknown>(`/webhooks/${id}`),
  test: (id: string) => http.post<WebhookTestResult>(`/webhooks/${id}/test`, {}),
  rotateSecret: (id: string) => http.post<{ secret: string }>(`/webhooks/${id}/rotate-secret`, {}),
  deliveries: (id: string) => http.get<WebhookDelivery[]>(`/webhooks/${id}/deliveries`),
};
