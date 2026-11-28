import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';

interface AdminTokenFormProps {
  authRole: 'none' | 'member' | 'admin';
  isOwnerMember: boolean;
  owner: string;
  repo: string;
  branch: string;
  privateRepo: string;
  vaultPassphrase: string;
  vaultAllowedUsers: string;
  token: string;
  showAdvanced: boolean;
  loading: boolean;
  restoringWhitelist: boolean;
  infoMsg: string | null;
  error: string | null;
  onChangeOwner: (v: string) => void;
  onChangeRepo: (v: string) => void;
  onChangeBranch: (v: string) => void;
  onChangePrivateRepo: (v: string) => void;
  onChangeVaultPassphrase: (v: string) => void;
  onChangeVaultAllowedUsers: (v: string) => void;
  onChangeToken: (v: string) => void;
  onToggleAdvanced: () => void;
  onRestoreWhitelist: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const AdminTokenForm: React.FC<AdminTokenFormProps> = ({
  authRole,
  isOwnerMember,
  owner,
  repo,
  branch,
  privateRepo,
  vaultPassphrase,
  vaultAllowedUsers,
  token,
  showAdvanced,
  loading,
  restoringWhitelist,
  infoMsg,
  error,
  onChangeOwner,
  onChangeRepo,
  onChangeBranch,
  onChangePrivateRepo,
  onChangeVaultPassphrase,
  onChangeVaultAllowedUsers,
  onChangeToken,
  onToggleAdvanced,
  onRestoreWhitelist,
  onSubmit,
  onClose,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-3.5 text-sm">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            GitHub Personal Access Token *
          </label>
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-sky-600 hover:underline dark:text-sky-400"
          >
            去 GitHub 生成
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <input
          type="password"
          value={token}
          onChange={(e) => onChangeToken(e.target.value)}
          placeholder="github_pat_..."
          autoComplete="off"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm outline-none focus:border-pink-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
          {authRole === 'admin'
            ? '站长 Token 需开启 NyaNavi（及私有扩展仓）的 Contents: Read and write 权限。'
            : '• 好友登录：创建时无需勾选任何仓库权限（0 权限即可），登录后仅可输入密钥只读查看私密库。\n• 站长登录：勾选仓库 Contents 读写权限自动解锁全部管理功能。'}
        </p>
      </div>

      {authRole === 'admin' && (
        <>
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Lock className="h-3.5 w-3.5 text-violet-500" />
              独立私有扩展仓库名（Private）
            </label>
            <input
              type="text"
              value={privateRepo}
              onChange={(e) => onChangePrivateRepo(e.target.value)}
              placeholder="例如：NyaNavi-Private"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-violet-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <KeyRound className="h-3.5 w-3.5 text-pink-500" />
              好友访问明文密钥（加密生成 vault.enc）
            </label>
            <input
              type="password"
              value={vaultPassphrase}
              onChange={(e) => onChangeVaultPassphrase(e.target.value)}
              placeholder="设一句你要告诉朋友的明文密钥"
              autoComplete="off"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-pink-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-500" />
                允许的好友 GitHub 用户名白名单（逗号分隔）
              </label>
              <button
                type="button"
                disabled={restoringWhitelist}
                onClick={onRestoreWhitelist}
                className="shrink-0 text-[11px] font-medium text-sky-600 hover:underline disabled:opacity-50 dark:text-sky-400"
              >
                {restoringWhitelist ? '解密中...' : '从 vault.enc 恢复'}
              </button>
            </div>
            <input
              type="text"
              value={vaultAllowedUsers}
              onChange={(e) => onChangeVaultAllowedUsers(e.target.value)}
              placeholder="例如：friendA, friendB"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              保存后白名单与密钥会自动备份到你的私有仓库{' '}
              <code className="font-mono">admin-settings.json</code>
              （跨设备登录自动回填，绝不写入公开仓）；外人看到的{' '}
              <code className="font-mono">vault.enc</code> 全程 AES-256 加密。
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleAdvanced}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            {showAdvanced ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            高级：主仓库参数（{owner}/{repo} · {branch}）
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">
                  GitHub 用户名
                </label>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => onChangeOwner(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">
                  主仓库 / 分支
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={repo}
                    onChange={(e) => onChangeRepo(e.target.value)}
                    className="w-3/5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => onChangeBranch(e.target.value)}
                    className="w-2/5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {infoMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {infoMsg}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-sky-500 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              验证身份中...
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5" />
              {authRole === 'admin'
                ? '保存站长配置'
                : isOwnerMember
                  ? '进入站长模式'
                  : '登录 GitHub'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};
