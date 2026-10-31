import { useQuery } from '@tanstack/react-query';
import { invoicesApi } from '@/api/endpoints/invoices';
import { queryKeys } from '@/api/queryKeys';

export const useInvoiceList = (status: string) =>
  useQuery({ queryKey: queryKeys.invoices.list({ status: status || undefined }), queryFn: () => invoicesApi.list(status || undefined) });
export const useInvoiceSummary = () => useQuery({ queryKey: [...queryKeys.invoices.all, 'summary'], queryFn: invoicesApi.summary });
export const useInvoice = (id: string) => useQuery({ queryKey: queryKeys.invoices.detail(id), queryFn: () => invoicesApi.get(id) });
