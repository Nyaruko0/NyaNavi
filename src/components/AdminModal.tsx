import React, { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  DEFAULT_GITHUB_CONFIG,
  verifyGitHubToken,
  verifyPrivateRepo,
  type GitHubConfig,
} from '../utils/githubSync';

interface AdminModalProps {
  open: boolean;
  currentConfig: GitHubConfig | null;
  adminUser?: string;
  onClose: () => void;
  onAuthenticated: (config: GitHubConfig, username?: string) => void;
  onLogout: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  open,
  currentConfig,
  adminUser,
  onClose,
  onAuthenticated,
  onLogout,
}) => {
  const [owner, setOwner] = useState(currentConfig?.owner || DEFAULT_GITHUB_CONFIG.owner);
  const [repo, setRepo] = useState(currentConfig?.repo || DEFAULT_GITHUB_CONFIG.repo);
  const [branch, setBranch] = useState(currentConfig?.branch || DEFAULT_GITHUB_CONFIG.branch);
  const [privateRepo, setPrivateRepo] = useState(currentConfig?.privateRepo || '');
  const [vaultPassphrase, setVaultPassphrase] = useState(currentConfig?.vaultPassphrase || '');
  const [vaultAllowedUsers, setVaultAllowedUsers] = useState(
    currentConfig?.vaultAllowedUsers || '',
  );
  const [token, setToken] = useState(currentConfig?.token || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('请输入 GitHub Personal Access Token');
      return;
    }

    setLoading(true);
    setError(null);

    const cfg: GitHubConfig = {
      owner: owner.trim() || DEFAULT_GITHUB_CONFIG.owner,
      repo: repo.trim() || DEFAULT_GITHUB_CONFIG.repo,
      branch: branch.trim() || DEFAULT_GITHUB_CONFIG.branch,
      path: DEFAULT_GITHUB_CONFIG.path,
      token: token.trim(),
      privateRepo: privateRepo.trim(),
      privateBranch: 'main',
      privatePath: 'private-sites.json',
      vaultPassphrase: vaultPassphrase.trim(),
      vaultAllowedUsers: vaultAllowedUsers.trim(),
    };

    const res = await verifyGitHubToken(cfg);
    if (!res.valid || !res.canPush) {
      setLoading(false);
      setError(res.error || '权限验证未通过');
      return;
    }

    if (cfg.privateRepo) {
      const privRes = await verifyPrivateRepo(cfg);
      if (!privRes.ok) {
        setLoading(false);
        setError(privRes.error || '私有扩展仓库校验未通过');
        return;
      }
    }

    setLoading(false);
    onAuthenticated(cfg, res.username);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#14192a]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-sky-500 text-white">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">
                站长登录 · GitHub 同步
              </h2>
              <p className="text-[11px] text-slate-400">
                仅仓库拥有者可解锁增删改并同步至 GitHub
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {currentConfig && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-2.5 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              已验证站长身份{adminUser ? `（@${adminUser}）` : ''}
            </span>
            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:bg-slate-900/70 dark:text-rose-400"
            >
              <LogOut className="h-3 w-3" />
              退出站长模式
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                GitHub 用户名
              </label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-pink-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                仓库名 / 分支
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  className="w-3/5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs outline-none focus:border-pink-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-2/5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs outline-none focus:border-pink-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Lock className="h-3.5 w-3.5 text-violet-500" />
                独立私有扩展仓库名（可选，仅站长可见）
              </label>
              <input
                type="text"
                value={privateRepo}
                onChange={(e) => setPrivateRepo(e.target.value)}
                placeholder="例如：NyaNavi-Private（须为 Private 私有仓库）"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-violet-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                填写后自动读取/同步该私有仓库的 <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">private-sites.json</code>，系统会强制校验其为 Private，严禁写入公开仓库。
              </p>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <KeyRound className="h-3.5 w-3.5 text-pink-500" />
                好友共享暗号（可选，AES-256 加密后开放给朋友只读）
              </label>
              <input
                type="password"
                value={vaultPassphrase}
                onChange={(e) => setVaultPassphrase(e.target.value)}
                placeholder="设一句只有你和朋友知道的暗号（改暗号后同步即生效）"
                autoComplete="off"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-pink-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                填写后点“同步到 GitHub”会自动在本地将私密站点加密为纯随机密文 <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">public/vault.enc</code>（无明文网址），朋友凭暗号即可只读解锁。
              </p>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-500" />
                允许解锁的好友 GitHub 用户名（可选，逗号分隔）
              </label>
              <input
                type="text"
                value={vaultAllowedUsers}
                onChange={(e) => setVaultAllowedUsers(e.target.value)}
                placeholder="例如：friendA, friendB（留空则仅凭明文密钥即可解锁）"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                好友白名单会和网址一起加密，外人不可见。填写后好友须先验证自己的 GitHub 身份 + 输入明文密钥才可获取。
              </p>
            </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Fine-grained Personal Access Token *
              </label>
              <a
                href="https://github.com/settings/personal-access-tokens/new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[11px] font-medium text-sky-600 hover:underline dark:text-sky-400"
              >
                去 GitHub 创建
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="github_pat_..."
              autoComplete="off"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs outline-none focus:border-pink-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
              创建时仅需勾选目标仓库 <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">Nyaruko0/NyaNavi</code> 的{' '}
              <strong className="text-slate-600 dark:text-slate-300">Contents: Read and write</strong>{' '}
              权限。Token 仅保存在你当前浏览器的本地存储中，不会上传到任何第三方服务器。
            </p>
          </div>

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
                  验证权限中...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  验证并解锁站长模式
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
