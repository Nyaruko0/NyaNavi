import React, { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Github,
  KeyRound,
  Loader2,
  Lock,
  Unlock,
  X,
} from 'lucide-react';
import type { SiteItem } from '../types';
import { fetchGitHubUsername } from '../utils/githubSync';
import { decryptVaultSites, type EncryptedVaultPayload } from '../utils/vaultCrypto';

interface VaultUnlockModalProps {
  open: boolean;
  isUnlocked: boolean;
  unlockedCount: number;
  friendUsername?: string;
  ownerUsername: string;
  onClose: () => void;
  onUnlocked: (
    sites: SiteItem[],
    passphrase: string,
    remember: boolean,
    ghToken?: string,
    ghUser?: string,
  ) => void;
  onLock: () => void;
}

export const VaultUnlockModal: React.FC<VaultUnlockModalProps> = ({
  open,
  isUnlocked,
  unlockedCount,
  friendUsername,
  ownerUsername,
  onClose,
  onUnlocked,
  onLock,
}) => {
  const [ghToken, setGhToken] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) {
      setError('请输入站长分享的明文密钥');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`./vault.enc?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('站长尚未发布加密私密库，请稍后再试');
      }
      const payload = (await res.json()) as EncryptedVaultPayload;

      // 先校验好友 GitHub 身份（若密文要求 GitHub 身份或好友填写了 Token）
      let verifiedUser: string | undefined;
      if (payload.requireGitHubAuth || ghToken.trim()) {
        if (!ghToken.trim()) {
          throw new Error('站长开启了好友白名单：请先填入你的 GitHub Token 完成身份校验');
        }
        verifiedUser = await fetchGitHubUsername(ghToken);
      }

      // 用明文密钥本地 AES-256-GCM 解密
      const decrypted = await decryptVaultSites(payload, passphrase);

      // 核对加密白名单（自动放行站长本人）
      if (decrypted.allowedUsers.length > 0) {
        if (!verifiedUser) {
          throw new Error('请先输入你的 GitHub Token 校验好友身份');
        }
        const normalizedUser = verifiedUser.toLowerCase();
        const isOwner = normalizedUser === ownerUsername.toLowerCase();
        if (!isOwner && !decrypted.allowedUsers.includes(normalizedUser)) {
          throw new Error(`账号 @${verifiedUser} 不在站长允许的好友名单中`);
        }
      }

      onUnlocked(
        decrypted.sites,
        passphrase.trim(),
        remember,
        ghToken.trim() || undefined,
        verifiedUser,
      );
      setPassphrase('');
      setGhToken('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证或解密失败，请核对后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <div
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-[3px]"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-2xl backdrop-blur-2xl dark:border-slate-800 dark:bg-[#131829]/95">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 text-white">
              {isUnlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">
                好友私密库解锁
              </h2>
              <p className="text-xs text-slate-400">
                GitHub 身份校验 + 明文密钥本地解密（只读）
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

        {isUnlocked ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-3 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                已解锁私密库{friendUsername ? `（@${friendUsername}）` : ''} · 共 {unlockedCount}{' '}
                个只读站点
              </span>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={() => {
                  onLock();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-600"
              >
                <Lock className="h-3.5 w-3.5" />
                立即锁定并清除凭证
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <Github className="h-3.5 w-3.5" />
                  好友 GitHub Token（用于验证 GitHub 身份）
                </label>
                <a
                  href="https://github.com/settings/personal-access-tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-[11px] font-medium text-sky-600 hover:underline dark:text-sky-400"
                >
                  生成零权限 Token
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <input
                type="password"
                value={ghToken}
                onChange={(e) => setGhToken(e.target.value)}
                placeholder="github_pat_...（无需勾选任何仓库权限）"
                autoComplete="off"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                若站长设置了好友名单则必填（仅校验 GitHub 用户名）；未设名单时可留空直接输密钥。
              </p>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <KeyRound className="h-3.5 w-3.5 text-violet-500" />
                明文密钥（站长分享的暗号）*
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="输入明文密钥..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base outline-none focus:border-violet-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded accent-violet-500"
              />
              在当前浏览器记住凭证（下次自动解锁，随时可手动锁定清除）
            </label>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 sm:w-auto sm:py-2 sm:text-xs dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60 sm:w-auto sm:py-2 sm:text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    验证并解密中...
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    校验并获取
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
