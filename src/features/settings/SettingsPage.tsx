import { useState } from 'react';
import { PageHead } from '@/components/ui/Layout';
import { AutomationTab } from './AutomationTab';
import { BranchesTab } from './BranchesTab';
import { CrmStagesTab } from './CrmStagesTab';
import { InvoiceTab } from './InvoiceTab';
import { LeaveTab } from './LeaveTab';
import { StagesTab } from './StagesTab';

const TABS = [
  ['leave', 'Leave & holidays', LeaveTab],
  ['stages', 'Pipeline stages', StagesTab],
  ['automation', 'Automation', AutomationTab],
  ['crm', 'CRM stages', CrmStagesTab],
  ['invoice', 'Invoice & company', InvoiceTab],
  ['branches', 'Branches', BranchesTab],
] as const;
type TabKey = (typeof TABS)[number][0];

export function SettingsPage() {
  const [tab, setTab] = useState<TabKey>('stages');
  const Current = TABS.find((t) => t[0] === tab)![2];
  return (
    <>
      <PageHead title="Settings" sub="Workspace configuration" />
      <div className="tabs" role="tablist" aria-label="Settings sections">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      <Current />
    </>
  );
}
