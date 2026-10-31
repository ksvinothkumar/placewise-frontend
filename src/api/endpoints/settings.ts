import { http } from '../http';

/** Pipeline stage as stored by the backend. `prob` is a 0..1 fraction (the editor shows percent). */
export interface StageDef {
  key: string;
  name: string;
  color: string;
  kind: string;
  prob: number;
}
export interface CrmStageDef {
  key: string;
  name: string;
  color: string;
  kind: string;
}
/** What the editors send: new stages have no key yet, the server mints one. */
export type StageInput = Omit<StageDef, 'key'> & { key?: string };
export type CrmStageInput = Omit<CrmStageDef, 'key'> & { key?: string };
export type CrmStageGroup = 'company' | 'contact';

export interface CompanyInfo {
  name: string;
  legalName: string;
  address: string;
  city: string;
  state: string;
  gstin: string;
  pan: string;
  email: string;
  phone: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
}
export interface InvoiceTemplate {
  accent: string;
  headerLayout: string;
  gstPct: number | string;
  sacCode: string;
  taxPrefix: string;
  proformaPrefix: string;
  autoType?: string;
  showLogo?: boolean;
  showBank?: boolean;
  terms: string;
  footer: string;
}
export interface LeaveTypeDef {
  key: string;
  name: string;
  days: number | string;
}
export interface Holiday {
  date: string;
  name: string;
}
export interface LeavePolicy {
  leaveTypes: LeaveTypeDef[];
  holidays: Holiday[];
  weeklyOff: number[];
}

/** GET /settings: stages for everyone, the rest only for `settings:manage`. */
export interface SettingsView extends Partial<LeavePolicy> {
  stages: StageDef[];
  crmStages: CrmStageDef[];
  contactStages: CrmStageDef[];
  company?: CompanyInfo;
  invoice?: InvoiceTemplate;
}

export interface Branch {
  id: string;
  name: string;
  code?: string;
  city?: string;
  active?: boolean;
  users: number;
  jobs: number;
}
export type BranchInput = Pick<Branch, 'name'> & Partial<Pick<Branch, 'code' | 'city'>>;

export const settingsApi = {
  base: '/settings',
  get: <T = SettingsView>() => http.get<T>('/settings'),
  states: () => http.get<string[]>('/settings/states'),
  /** candidates per stage name */
  stageUsage: () => http.get<Record<string, number>>('/settings/stage-usage'),
  saveStages: (stages: StageInput[], moves?: Record<string, string>) => http.put<unknown>('/settings/stages', { stages, moves }),
  saveCrmStages: (which: CrmStageGroup, stages: CrmStageInput[], moves?: Record<string, string>) =>
    http.put<unknown>(`/settings/crm-stages/${which}`, { stages, moves }),
  saveCompany: (company: CompanyInfo) => http.put<unknown>('/settings/company', company),
  saveInvoice: (invoice: InvoiceTemplate) => http.put<unknown>('/settings/invoice', invoice),
  /** mounted by the attendance module in the backend, at /settings/leave */
  saveLeave: (policy: LeavePolicy) => http.put<unknown>('/settings/leave', policy),
};

export const branchesApi = {
  list: () => http.get<Branch[]>('/branches'),
  create: (b: BranchInput) => http.post<Branch>('/branches', b),
  update: (id: string, b: BranchInput) => http.put<Branch>(`/branches/${id}`, b),
  remove: (id: string) => http.delete<{ ok: boolean }>(`/branches/${id}`),
};
