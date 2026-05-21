import { useT, type TranslationKey } from '@/lib/i18n';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useTreeStore } from '@/lib/store/treeStore';
import type { ReportAudience } from '@/types/tree';

const AUDIENCE_KEY: Record<ReportAudience, TranslationKey> = {
  engineer: 'report.audienceEngineer',
  manager: 'report.audienceManager',
  researcher: 'report.audienceResearcher',
};

function RangeField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}: {value}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

// GOT dimensions config panel (Phase 5.5.1). Edits the persisted settingsStore;
// depth + branching also patch the live tree so the current graph honours them
// immediately. Width only affects the next generated graph.
export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const settings = useSettingsStore();
  const updateConfig = useTreeStore((s) => s.updateConfig);

  const setBranching = (n: number) => {
    settings.setExpansionBranches(n);
    updateConfig({ expansionBranches: n });
  };
  const setDepth = (n: number) => {
    settings.setMaxExpansionLayers(n);
    updateConfig({ maxExpansionLayers: n });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-sm font-semibold">{t('settings.title')}</h2>

        <div className="flex flex-col gap-4">
          <RangeField
            label={t('settings.width')}
            value={settings.initialBranches}
            min={2}
            max={8}
            onChange={settings.setInitialBranches}
          />
          <RangeField
            label={t('settings.branching')}
            value={settings.expansionBranches}
            min={2}
            max={6}
            onChange={setBranching}
          />
          <RangeField
            label={t('settings.depth')}
            value={settings.maxExpansionLayers}
            min={1}
            max={6}
            onChange={setDepth}
          />

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('settings.audience')}
            </span>
            <select
              className="h-8 rounded-md border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={settings.reportAudience}
              onChange={(e) =>
                settings.setReportAudience(e.target.value as ReportAudience)
              }
            >
              {(Object.keys(AUDIENCE_KEY) as ReportAudience[]).map((a) => (
                <option key={a} value={a}>
                  {t(AUDIENCE_KEY[a])}
                </option>
              ))}
            </select>
          </label>

          <p className="text-[11px] text-muted-foreground">
            {t('settings.hint')}
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            onClick={onClose}
          >
            {t('settings.done')}
          </button>
        </div>
      </div>
    </div>
  );
}
