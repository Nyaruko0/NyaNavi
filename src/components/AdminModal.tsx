import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Github,
  LogOut,
  ShieldCheck,
  Unlock,
  X,
} from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import type { SiteItem } from '../types';
import {
  DEFAULT_GITHUB_CONFIG,
  verifyGitHubToken,
  verifyPrivateRepo,
  type GitHubConfig,
} from '../utils/githubSync';
import { isOAuthConfigured, prepareOAuthLoginUrl } from '../utils/oauthConfig';
import {
  DEFAULT_PRIVATE_BRANCH,
  DEFAULT_PRIVATE_PATH,
  DEFAULT_PRIVATE_REPO,
} from '../utils/siteRules';
import { decryptVaultSites, type EncryptedVaultPayload } from '../utils/vaultCrypto';
import { AdminMemberView } from './AdminMemberView';
import { AdminTokenForm } from './AdminTokenForm';

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
    currentConfig?.privateRepo || DEFAULT_PRIVATE_REPO,
  );
  const [vaultPassphrase, setVaultPassphrase] = useState(currentConfig?.vaultPassphrase || '');
  const [vaultAllowedUsers, setVaultAllowedUsers] = useState(
    currentConfig?.vaultAllowedUsers || '',
  );
  const [token, setToken] = useState(currentConfig?.token || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAdminTokenForm, setShowAdminTokenForm] = useState(false);
  const [showOwnerFriendUnlock, setShowOwnerFriendUnlock] = useState(false);

  const [friendKeyInput, setFriendKeyInput] = useState('');
  const [rememberKey, setRememberKey] = useState(true);

  const [loading, setLoading] = useState(false);
  const [restoringWhitelist, setRestoringWhitelist] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEscapeKey(open, onClose);

  const isOwnerMember =
    authRole === 'member' &&
    Boolean(authUser) &&
    authUser!.toLowerCase() === (currentConfig?.owner || DEFAULT_GITHUB_CONFIG.owner).toLowerCase();

  useEffect(() => {
    if (!open) return;
    setOwner(currentConfig?.owner || DEFAULT_GITHUB_CONFIG.owner);
    setRepo(currentConfig?.repo || DEFAULT_GITHUB_CONFIG.repo);
    setBranch(currentConfig?.branch || DEFAULT_GITHUB_CONFIG.branch);
    setPrivateRepo(currentConfig?.privateRepo || DEFAULT_PRIVATE_REPO);
    setVaultPassphrase(currentConfig?.vaultPassphrase || '');
    setVaultAllowedUsers(currentConfig?.vaultAllowedUsers || '');
    setToken(currentConfig?.token || '');
    setShowAdminTokenForm(authRole === 'admin' || isOwnerMember);
    setShowOwnerFriendUnlock(false);
    setInfoMsg(null);
    setError(null);
  }, [open, currentConfig, authRole, isOwnerMember]);

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
      if (!res.ok) throw new Error('线上尚未找到 vault.enc 文件');
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
      privateBranch: DEFAULT_PRIVATE_BRANCH,
      privatePath: DEFAULT_PRIVATE_PATH,
      vaultPassphrase: vaultPassphrase.trim(),
      vaultAllowedUsers: vaultAllowedUsers.trim(),
    };

    const res = await verifyGitHubToken(cfg);
    if (!res.valid || !res.username) {
      setLoading(false);
      setError(res.error || 'GitHub 登录失败');
      return;
    }

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
      setLoading(false);
      onMemberAuthenticated(
        {
          owner: DEFAULT_GITHUB_CONFIG.owner,
          repo: DEFAULT_GITHUB_CONFIG.repo,
          branch: DEFAULT_GITHUB_CONFIG.branch,
          path: DEFAULT_GITHUB_CONFIG.path,
          token: token.trim(),
        },
        res.username,
      );
    }
  };

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
      if (!res.ok) throw new Error('站长尚未发布私密加密库');
      const payload = (await res.json()) as EncryptedVaultPayload;
      const decrypted = await decryptVaultSites(payload, friendKeyInput);

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
            aria-label="关闭弹窗"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {authRole === 'member' && !isOwnerMember ? (
          <AdminMemberView
            authUser={authUser}
            friendUnlocked={friendUnlocked}
            friendVaultCount={friendVaultCount}
            friendKeyInput={friendKeyInput}
            rememberKey={rememberKey}
            loading={loading}
            infoMsg={infoMsg}
            error={error}
            onChangeFriendKey={setFriendKeyInput}
            onChangeRememberKey={setRememberKey}
            onSubmitUnlock={handleFriendUnlockSubmit}
            onFriendLock={onFriendLock}
            onLogout={onLogout}
            onClose={onClose}
          />
        ) : (
          <>
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
                  在下方粘贴一次你的 GitHub PAT 即可立即进入完整站长模式；或在 Cloudflare Worker 添加 Secret{' '}
                  <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    ADMIN_GITHUB_PAT
                  </code>
                  实现免输直进。
                </p>
                {showOwnerFriendUnlock && (
                  <form
                    onSubmit={handleFriendUnlockSubmit}
                    className="space-y-2 rounded-xl border border-violet-200/70 bg-violet-50/40 p-3 dark:border-violet-500/20 dark:bg-violet-500/5"
                  >
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

            {authRole === 'none' && (
              <div className="mb-4 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    const loginUrl = isOAuthConfigured() ? prepareOAuthLoginUrl() : null;
                    if (loginUrl) {
                      window.location.href = loginUrl;
                    } else {
                      setError('站长尚未配置 Cloudflare Worker OAuth 地址');
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

            {authRole === 'admin' || showAdminTokenForm ? (
              <AdminTokenForm
                authRole={authRole}
                isOwnerMember={isOwnerMember}
                owner={owner}
                repo={repo}
                branch={branch}
                privateRepo={privateRepo}
                vaultPassphrase={vaultPassphrase}
                vaultAllowedUsers={vaultAllowedUsers}
                token={token}
                showAdvanced={showAdvanced}
                loading={loading}
                restoringWhitelist={restoringWhitelist}
                infoMsg={infoMsg}
                error={error}
                onChangeOwner={setOwner}
                onChangeRepo={setRepo}
                onChangeBranch={setBranch}
                onChangePrivateRepo={setPrivateRepo}
                onChangeVaultPassphrase={setVaultPassphrase}
                onChangeVaultAllowedUsers={setVaultAllowedUsers}
                onChangeToken={setToken}
                onToggleAdvanced={() => setShowAdvanced((v) => !v)}
                onRestoreWhitelist={handleRestoreWhitelistFromVault}
                onSubmit={handleLoginOrSaveAdmin}
                onClose={onClose}
              />
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
