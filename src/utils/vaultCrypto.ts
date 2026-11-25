import type { SiteItem } from '../types';
import { normalizePrivateSite } from './siteRules';

export interface EncryptedVaultPayload {
  v: 1;
  alg: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  iter: number;
  salt: string;
  iv: string;
  data: string;
  /** 是否要求先验证好友 GitHub 身份并匹配加密白名单（不暴露具体名单） */
  requireGitHubAuth?: boolean;
  updatedAt: string;
}

interface DecryptedVaultData {
  sites: SiteItem[];
  allowedUsers: string[];
}

const PBKDF2_ITERATIONS = 150000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function parseAllowedUsers(raw?: string): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(/[,，\s]+/)
        .map((s) => s.trim().replace(/^@/, '').toLowerCase())
        .filter(Boolean),
    ),
  );
}

/**
 * 使用浏览器原生 Web Crypto API (PBKDF2 + AES-256-GCM) 将私密站点与好友 GitHub 白名单一并加密
 */
export async function encryptVaultSites(
  sites: SiteItem[],
  passphrase: string,
  allowedUsersInput?: string,
): Promise<EncryptedVaultPayload> {
  const cleanPass = passphrase.trim();
  if (!cleanPass) {
    throw new Error('明文密钥不能为空');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(cleanPass, salt, PBKDF2_ITERATIONS);

  const normalized = sites.map(normalizePrivateSite);
  const allowedUsers = parseAllowedUsers(allowedUsersInput);

  const inner = {
    sites: normalized,
    allowedUsers,
  };
  const plaintext = new TextEncoder().encode(JSON.stringify(inner));
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext,
  );

  return {
    v: 1,
    alg: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iter: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(ciphertextBuf)),
    requireGitHubAuth: allowedUsers.length > 0,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 用明文密钥在浏览器本地解密 vault.enc（兼容数组与对象结构）
 */
export async function decryptVaultSites(
  payload: EncryptedVaultPayload,
  passphrase: string,
): Promise<DecryptedVaultData> {
  const cleanPass = passphrase.trim();
  if (!cleanPass) {
    throw new Error('请输入明文密钥');
  }
  if (!payload || payload.v !== 1 || !payload.salt || !payload.iv || !payload.data) {
    throw new Error('密文文件格式无效');
  }

  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const data = base64ToBytes(payload.data);
  const key = await deriveAesKey(cleanPass, salt, payload.iter || PBKDF2_ITERATIONS);

  try {
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      data as BufferSource,
    );
    const parsed = JSON.parse(new TextDecoder().decode(plainBuf));
    const rawSites: SiteItem[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.sites)
        ? parsed.sites
        : [];
    const allowedUsers: string[] = Array.isArray(parsed?.allowedUsers)
      ? parsed.allowedUsers.map((u: string) => String(u).toLowerCase())
      : [];

    return {
      sites: rawSites.map(normalizePrivateSite),
      allowedUsers,
    };
  } catch {
    throw new Error('明文密钥不对，解密失败，请核对后再试');
  }
}
