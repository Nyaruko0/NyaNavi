import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Github,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  ShieldCheck,
  Unlock,
  UserCheck,
  X,
} from 'lucide-react';
import type { SiteItem } from '../types';
import {
  DEFAULT_GITHUB_CONFIG,
  verifyGitHubToken,
  verifyPrivateRepo,
  type GitHubConfig,
} from '../utils/githubSync';
import { getOAuthLoginUrl } from '../utils/oauthConfig';
import { decryptVaultSites, type EncryptedVaultPayload } from '../utils/vaultCrypto';

interface AdminModalProps {
  open: boolean;
  currentConfig: GitHubConfig | null;
  authRole: 'none' | 'member' | 'admin';
  authUser?: string;
  friendUnlocked: boolean;
  friendVaultCount: number;
  onClose: () => void;
  onAdminAuthenticated: (config: GitHubConfig, username?: string) => void;
  onMemberAuthenticated: (config: GitHubConfig, username: string) => void;
  onFriendUnlocked: (sites: SiteItem[], passphrase: string, remember: boolean) => void;
  onFriendLock: () => void;
  onLogout: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  open,
  currentConfig,
  authRole,
  authUser,
  friendUnlocked,
  friendVaultCount,
  onClose,
  onAdminAuthenticated,
  onMemberAuthenticated,
  onFriendUnlocked,
  onFriendLock,
  onLogout,
}) => {
  const [owner, setOwner] = useState(currentConfig?.owner || DEFAULT_GITHUB_CONFIG.owner);
  const [repo, setRepo] = useState(currentConfig?.repo || DEFAULT_GITHUB_CONFIG.repo);
  const [branch, setBranch] = useState(currentConfig?.branch || DEFAULT_GITHUB_CONFIG.branch);
  const [privateRepo, setPrivateRepo] = useState(
    currentConfig?.privateRepo || 'NyaNavi-Private',
  );
  const [vaultPassphrase, setVaultPassphrase] = useState(currentConfig?.vaultPassphrase || '');
  const [vaultAllowedUsers, setVaultAllowedUsers] = useState(
    currentConfig?.vaultAllowedUsers || '',
  );
  const [token, setToken] = useState(currentConfig?.token || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAdminTokenForm, setShowAdminTokenForm] = useState(false);
  const [showOwnerFriendUnlock, setShowOwnerFriendUnlock] = useState(false);

  // 普通用户（好友）输入明文密钥的状态
  const [friendKeyInput, setFriendKeyInput] = useState('');
  const [rememberKey, setRememberKey] = useState(true);

  const [loading, setLoading] = useState(false);
  const [restoringWhitelist, setRestoringWhitelist] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const oauthLoginUrl = getOAuthLoginUrl();
  const isOwnerMember =
    authRole === 'member' &&
    Boolean(authUser) &&
    authUser!.toLowerCase() === (currentConfig?.owner || DEFAULT_GITHUB_CONFIG.owner).toLowerCase();

  useEffect(() => {
    if (!open) return;
    setOwner(currentConfig?.owner || DEFAULT_GITHUB_CONFIG.owner);
    setRepo(currentConfig?.repo || DEFAULT_GITHUB_CONFIG.repo);
    setBranch(currentConfig?.branch || DEFAULT_GITHUB_CONFIG.branch);
    setPrivateRepo(currentConfig?.privateRepo || 'NyaNavi-Private');
    setVaultPassphrase(currentConfig?.vaultPassphrase || '');
    setVaultAllowedUsers(currentConfig?.vaultAllowedUsers || '');
    setToken(currentConfig?.token || '');
    setShowAdminTokenForm(authRole === 'admin' || isOwnerMember);
    setShowOwnerFriendUnlock(false);
    setInfoMsg(null);
    setError(null);
  }, [open, currentConfig, authRole, isOwnerMember]);

  // 站长一键从线上现有 public/vault.enc 恢复原有好友白名单（防止换设备/重登后白名单丢失）
  const handleRestoreWhitelistFromVault = async () => {
    const pass = vaultPassphrase.trim();
    if (!pass) {
      setError('请先在上方填入你之前设置的「好友访问明文密钥」，再点击恢复白名单');
      return;
    }
    setRestoringWhitelist(true);
    setError(null);
    setInfoMsg(null);
    try {
      const res = await fetch(`./vault.enc?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('线上尚未找到 vault.enc 文件');
      }
      const payload = (await res.json()) as EncryptedVaultPayload;
      const decrypted = await decryptVaultSites(payload, pass);
      if (decrypted.allowedUsers.length === 0) {
        setInfoMsg('已成功解密 vault.enc，但其中未配置好友白名单');
      } else {
        setVaultAllowedUsers(decrypted.allowedUsers.join(', '));
        setInfoMsg(
          `已从 vault.enc 恢复 ${decrypted.allowedUsers.length} 位好友白名单，点下方“保存站长配置”将同步备份至私有仓库`,
        );
      }
    } catch {
      setError('解密失败：请确认上方填写的「好友访问明文密钥」与之前设置的一致');
    } finally {
      setRestoringWhitelist(false);
    }
  };

  if (!open) return null;

  // 1. 统一 GitHub 登录（未登录时）或 站长保存配置（已登录为站长时）
  const handleLoginOrSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('请输入 GitHub Token');
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
    if (!res.valid || !res.username) {
      setLoading(false);
      setError(res.error || 'GitHub 登录失败');
      return;
    }

    // 身份自动分流：有仓库写权限 = 站长；无写权限 = 普通只读用户/好友
    if (res.canPush) {
      if (cfg.privateRepo) {
        const privRes = await verifyPrivateRepo(cfg);
        if (!privRes.ok) {
          setLoading(false);
          setError(privRes.error || '私有扩展仓库校验未通过');
          return;
        }
      }
      setLoading(false);
      onAdminAuthenticated(cfg, res.username);
      onClose();
    } else {
      // 普通人登录：不保存任何站长配置，保留纯净只读登录态并停留在弹窗让其直接输密钥
      setLoading(false);
      const memberCfg: GitHubConfig = {
        owner: DEFAULT_GITHUB_CONFIG.owner,
        repo: DEFAULT_GITHUB_CONFIG.repo,
        branch: DEFAULT_GITHUB_CONFIG.branch,
        path: DEFAULT_GITHUB_CONFIG.path,
        token: token.trim(),
      };
      onMemberAuthenticated(memberCfg, res.username);
    }
  };

  // 2. 普通登录用户（好友）输入明文密钥，严格校验「是好友 + 密钥正确」
  const handleFriendUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) {
      setError('请先登录 GitHub');
      return;
    }
    if (!friendKeyInput.trim()) {
      setError('请输入明文密钥');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`./vault.enc?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('站长尚未发布私密加密库');
      }
      const payload = (await res.json()) as EncryptedVaultPayload;
      const decrypted = await decryptVaultSites(payload, friendKeyInput);

      // 严格双条件校验：必须是好友名单中的 GitHub 账号 + 密钥正确
      const currentLower = authUser.toLowerCase();
      const ownerLower = (currentConfig?.owner || DEFAULT_GITHUB_CONFIG.owner).toLowerCase();
      const isOwner = currentLower === ownerLower;

      if (!isOwner) {
        if (decrypted.allowedUsers.length === 0) {
          throw new Error('站长尚未配置允许访问的好友 GitHub 名单');
        }
        if (!decrypted.allowedUsers.includes(currentLower)) {
          throw new Error(`账号 @${authUser} 不在站长允许的好友名单中，无权访问私密内容`);
        }
      }

      onFriendUnlocked(decrypted.sites, friendKeyInput.trim(), rememberKey);
      setFriendKeyInput('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '密钥不正确或无访问权限');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-3 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6 dark:border-slate-800 dark:bg-[#14192a]">
        {/* 头部 */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-sky-500 text-white">
              <Github className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">
                {authRole === 'admin'
                  ? '站长管理 · GitHub 同步'
                  : isOwnerMember
                    ? '已识别站长账号 · 升级站长模式'
                    : authRole === 'member'
                      ? '好友身份 · 私密库解锁'
                      : 'GitHub 账号登录'}
              </h2>
              <p className="text-xs text-slate-400">
                {authRole === 'admin'
                  ? '拥有完整编辑权限与好友访问配置'
                  : isOwnerMember
                    ? '当前为 OAuth 只读登录，填入 PAT 即可解锁编辑与云端同步'
                    : authRole === 'member'
                      ? '只读身份 · 无法修改任何站点内容'
                      : '站长自动进入管理模式，好友登录可凭密钥查看私密库'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* =============== 视图 A：普通用户 / 好友已登录（严格只读，只能输密钥；站长账号则直接展示升级站长表单） =============== */}
        {authRole === 'member' && !isOwnerMember && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-sky-200/80 bg-sky-50/70 px-3.5 py-2.5 text-xs text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <UserCheck className="h-4 w-4" />
                已登录 @{authUser}（只读）
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
                退出登录
              </button>
            </div>

            {friendUnlocked ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-3 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>好友身份与密钥均已验证，已解锁 {friendVaultCount} 个私密站点（只读）</span>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    完成
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onFriendLock();
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    锁定私密内容
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFriendUnlockSubmit} className="space-y-3.5">
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <KeyRound className="h-3.5 w-3.5 text-violet-500" />
                    输入站长给你的明文密钥
                  </label>
                  <input
                    type="password"
                    autoFocus
                    value={friendKeyInput}
                    onChange={(e) => setFriendKeyInput(e.target.value)}
                    placeholder="输入明文密钥..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base outline-none focus:border-violet-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                    仅当你的账号 <strong className="text-slate-600 dark:text-slate-300">@{authUser}</strong>{' '}
                    在站长好友名单内且密钥正确时，才会在本机解密显示私密内容。
                  </p>
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={rememberKey}
                    onChange={(e) => setRememberKey(e.target.checked)}
                    className="h-4 w-4 rounded accent-violet-500"
                  />
                  在当前浏览器记住密钥（下次免输，退出登录自动清除）
                </label>

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

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    暂不解锁
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        核验解密中...
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3.5 w-3.5" />
                        验证并获取私密内容
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* =============== 视图 B：未登录、站长 OAuth 待升级 或 站长已登录 =============== */}
        {(authRole !== 'member' || isOwnerMember) && (
          <>
            {/* 站长用 OAuth 登录后但 Worker 尚未下发 PAT 时的专属提示 */}
            {isOwnerMember && (
              <div className="mb-4 space-y-2.5">
                <div className="flex items-center justify-between rounded-xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    已识别站长 @{authUser}（缺少写权限 Token）
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
                    退出
                  </button>
                </div>
                <p className="rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-[11px] leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                  在下方粘贴一次你的 GitHub PAT 即可立即进入完整站长模式；若希望以后任何设备点「GitHub 一键登录」直接免输 Token 秒进站长模式，请更新 Cloudflare Worker 代码并添加 Secret{' '}
                  <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    ADMIN_GITHUB_PAT
                  </code>
                  。
                </p>
                {showOwnerFriendUnlock && (
                  <form onSubmit={handleFriendUnlockSubmit} className="space-y-2 rounded-xl border border-violet-200/70 bg-violet-50/40 p-3 dark:border-violet-500/20 dark:bg-violet-500/5">
                    <input
                      type="password"
                      value={friendKeyInput}
                      onChange={(e) => setFriendKeyInput(e.target.value)}
                      placeholder="临时以只读明文密钥查看私密库..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center gap-1 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-60"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      只读解锁私密库
                    </button>
                  </form>
                )}
                <button
                  type="button"
                  onClick={() => setShowOwnerFriendUnlock((v) => !v)}
                  className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showOwnerFriendUnlock ? '收起只读密钥解锁' : '或临时用明文密钥只读查看私密库'}
                </button>
              </div>
            )}

            {/* 未登录时：首屏直接展示“一键 GitHub OAuth 登录” */}
            {authRole === 'none' && (
              <div className="mb-4 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    if (oauthLoginUrl) {
                      window.location.href = oauthLoginUrl;
                    } else {
                      setError(
                        '站长尚未配置 Cloudflare Worker OAuth 地址（部署好 cloudflare-worker/oauth-worker.js 后填入 oauthConfig.ts 即可启用一键登录）',
                      );
                    }
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  <Github className="h-4.5 w-4.5" />
                  使用 GitHub 账号一键登录
                </button>
                <p className="text-center text-[11px] leading-relaxed text-slate-400">
                  站长登录自动识别并进入站长管理模式；好友登录仅需最小只读权限，凭明文密钥即可查看私密库。
                </p>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200/80 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAdminTokenForm((v) => !v)}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-0.5 text-[11px] font-medium text-slate-400 transition hover:text-slate-600 dark:bg-[#14192a] dark:hover:text-slate-200"
                    >
                      {showAdminTokenForm ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      站长管理登录（Token 读写通道）
                    </button>
                  </div>
                </div>
              </div>
            )}

            {authRole === 'admin' && (
              <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-2.5 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  站长已登录（@{authUser} · 读写权限）
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
                  退出登录
                </button>
              </div>
            )}

            {(authRole === 'admin' || showAdminTokenForm) ? (
            <form onSubmit={handleLoginOrSaveAdmin} className="space-y-3.5 text-sm">
              {/* Token 输入框（所有人都填这里） */}
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
                  onChange={(e) => setToken(e.target.value)}
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

              {/* 仅站长登录后才展示私密库、好友白名单、密钥与仓库配置，普通登录界面干干净净 */}
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
                      onChange={(e) => setPrivateRepo(e.target.value)}
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
                      onChange={(e) => setVaultPassphrase(e.target.value)}
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
                        onClick={handleRestoreWhitelistFromVault}
                        className="shrink-0 text-[11px] font-medium text-sky-600 hover:underline disabled:opacity-50 dark:text-sky-400"
                      >
                        {restoringWhitelist ? '解密中...' : '从 vault.enc 恢复'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={vaultAllowedUsers}
                      onChange={(e) => setVaultAllowedUsers(e.target.value)}
                      placeholder="例如：friendA, friendB"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                      保存后白名单与密钥会自动备份到你的私有仓库 <code className="font-mono">admin-settings.json</code>（跨设备登录自动回填，绝不写入公开仓）；外人看到的 <code className="font-mono">vault.enc</code> 全程 AES-256 加密。
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
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
                          onChange={(e) => setOwner(e.target.value)}
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
                            onChange={(e) => setRepo(e.target.value)}
                            className="w-3/5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
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
            ) : (
              error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                  {error}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
};
