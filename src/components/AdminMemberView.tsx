import React from 'react';
import { CheckCircle2, KeyRound, Loader2, Lock, LogOut, Unlock, UserCheck } from 'lucide-react';

interface AdminMemberViewProps {
  authUser?: string;
  friendUnlocked: boolean;
  friendVaultCount: number;
  friendKeyInput: string;
  rememberKey: boolean;
  loading: boolean;
  infoMsg: string | null;
  error: string | null;
  onChangeFriendKey: (val: string) => void;
  onChangeRememberKey: (val: boolean) => void;
  onSubmitUnlock: (e: React.FormEvent) => void;
  onFriendLock: () => void;
  onLogout: () => void;
  onClose: () => void;
}

/** 普通用户 / 好友只读登录视图（负责明文密钥本地解密私密库） */
export const AdminMemberView: React.FC<AdminMemberViewProps> = ({
  authUser,
  friendUnlocked,
  friendVaultCount,
  friendKeyInput,
  rememberKey,
  loading,
  infoMsg,
  error,
  onChangeFriendKey,
  onChangeRememberKey,
  onSubmitUnlock,
  onFriendLock,
  onLogout,
  onClose,
}) => {
  return (
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
              onClick={onFriendLock}
              className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600"
            >
              <Lock className="h-3.5 w-3.5" />
              锁定私密内容
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmitUnlock} className="space-y-3.5">
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <KeyRound className="h-3.5 w-3.5 text-violet-500" />
              输入站长给你的明文密钥
            </label>
            <input
              type="password"
              autoFocus
              value={friendKeyInput}
              onChange={(e) => onChangeFriendKey(e.target.value)}
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
              onChange={(e) => onChangeRememberKey(e.target.checked)}
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
  );
};
