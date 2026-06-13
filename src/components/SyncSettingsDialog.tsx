import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '../i18n';
import { useNotesStore } from '../store/notesStore';
import {
  DEFAULT_WEBDAV_CONFIG,
  isWebdavConfigured,
  loadSyncState,
  loadWebdavConfig,
  saveWebdavConfig,
  type WebdavConfig,
} from '../lib/syncConfig';
import { pullFromWebdav, pushToWebdav, verifyWebdav } from '../services/webdavSync';

interface SyncSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SyncSettingsDialog({ isOpen, onClose }: SyncSettingsDialogProps) {
  const [config, setConfig] = useState<WebdavConfig>(DEFAULT_WEBDAV_CONFIG);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState<'verify' | 'push' | 'pull' | null>(null);
  const loadWorkspace = useNotesStore((state) => state.loadWorkspace);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void Promise.all([loadWebdavConfig(), loadSyncState()]).then(([loadedConfig, state]) => {
      if (cancelled) return;
      setConfig(loadedConfig);
      setLastSyncedAt(state.lastSyncedAt);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const updateField = <K extends keyof WebdavConfig>(key: K, value: WebdavConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const persist = async (next: WebdavConfig) => {
    await saveWebdavConfig(next);
  };

  const handleSaveField = async <K extends keyof WebdavConfig>(key: K, value: WebdavConfig[K]) => {
    const next = { ...config, [key]: value };
    setConfig(next);
    await persist(next);
  };

  const handleVerify = async () => {
    if (!isWebdavConfigured(config)) {
      toast.error(t('syncNotConfigured'));
      return;
    }
    setBusy('verify');
    try {
      await persist(config);
      await verifyWebdav(config);
      toast.success(t('syncVerifySuccess'));
    } catch (error) {
      toast.error(t('syncVerifyFailed', { error: errorMessage(error) }));
    } finally {
      setBusy(null);
    }
  };

  const handlePush = async () => {
    if (!isWebdavConfigured(config)) {
      toast.error(t('syncNotConfigured'));
      return;
    }
    setBusy('push');
    try {
      await persist(config);
      await pushToWebdav(config);
      const state = await loadSyncState();
      setLastSyncedAt(state.lastSyncedAt);
      toast.success(t('syncPushSuccess'));
    } catch (error) {
      toast.error(t('syncPushFailed', { error: errorMessage(error) }));
    } finally {
      setBusy(null);
    }
  };

  const handlePull = async () => {
    if (!isWebdavConfigured(config)) {
      toast.error(t('syncNotConfigured'));
      return;
    }
    if (!window.confirm(t('syncPullConfirm'))) return;
    setBusy('pull');
    try {
      await persist(config);
      await pullFromWebdav(config);
      await loadWorkspace();
      const state = await loadSyncState();
      setLastSyncedAt(state.lastSyncedAt);
      toast.success(t('syncPullSuccess'));
    } catch (error) {
      toast.error(t('syncPullFailed', { error: errorMessage(error) }));
    } finally {
      setBusy(null);
    }
  };

  const lastSyncedLabel = lastSyncedAt
    ? t('syncLastSynced', { time: new Date(lastSyncedAt).toLocaleString() })
    : t('syncNeverSynced');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-[var(--color-surface)] rounded-[12px] shadow-[var(--shadow-md)] w-full max-w-md mx-4 border border-[var(--color-border)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-[15px] font-semibold text-[var(--color-text)]">{t('syncTitle')}</h3>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <Field label={t('syncServerUrl')}>
            <input
              className="input-field !pl-3"
              placeholder={t('syncServerUrlPlaceholder')}
              value={config.url}
              onChange={(event) => updateField('url', event.target.value)}
              onBlur={() => void persist(config)}
            />
          </Field>
          <Field label={t('syncUsername')}>
            <input
              className="input-field !pl-3"
              placeholder={t('syncUsernamePlaceholder')}
              value={config.username}
              onChange={(event) => updateField('username', event.target.value)}
              onBlur={() => void persist(config)}
            />
          </Field>
          <Field label={t('syncPassword')}>
            <input
              className="input-field !pl-3"
              type="password"
              placeholder={t('syncPasswordPlaceholder')}
              value={config.password}
              onChange={(event) => updateField('password', event.target.value)}
              onBlur={() => void persist(config)}
            />
          </Field>
          <Field label={t('syncFolder')}>
            <input
              className="input-field !pl-3"
              placeholder={t('syncFolderPlaceholder')}
              value={config.directory}
              onChange={(event) => updateField('directory', event.target.value)}
              onBlur={() => void persist(config)}
            />
          </Field>

          <label className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(event) => void handleSaveField('enabled', event.target.checked)}
            />
            {t('syncAutoUpload')}
          </label>

          <div className="text-[12px] text-[var(--color-text-secondary)]">{lastSyncedLabel}</div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 px-5 py-4 border-t border-[var(--color-border)]">
          <button type="button" onClick={handleVerify} className="btn btn-secondary" disabled={busy !== null}>
            {t('syncVerify')}
          </button>
          <button type="button" onClick={handlePull} className="btn btn-secondary" disabled={busy !== null}>
            {busy === 'pull' ? t('syncPulling') : t('syncPull')}
          </button>
          <button type="button" onClick={handlePush} className="btn btn-primary" disabled={busy !== null}>
            {busy === 'push' ? t('syncPushing') : t('syncPush')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] text-[var(--color-text-secondary)] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
