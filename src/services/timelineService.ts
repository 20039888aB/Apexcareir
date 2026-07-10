import { httpClient } from '../api';

export type TransactionEvent = {
  id: number;
  module: string;
  reference_number: string;
  reference_id: string;
  event_type: string;
  description: string;
  user: number | null;
  user_email: string | null;
  created_at: string;
};

export async function getTransactionTimeline(referenceNumber: string, module?: string) {
  const response = await httpClient.get<{ count: number; results: TransactionEvent[] }>('/timeline/', {
    params: { reference_number: referenceNumber, module: module || undefined },
  });
  return response.data;
}
