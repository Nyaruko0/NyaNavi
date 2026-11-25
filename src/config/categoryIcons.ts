import type React from 'react';
import {
  AppWindow,
  BookMarked,
  BookOpen,
  Bot,
  Briefcase,
  Clapperboard,
  DownloadCloud,
  FileText,
  Film,
  Flame,
  Folder,
  FolderArchive,
  Gamepad2,
  Globe,
  Headphones,
  Image,
  ImageUp,
  Languages,
  Library,
  Lock,
  Mail,
  Puzzle,
  ScanSearch,
  Send,
  Share2,
  Sparkles,
  Terminal,
  Tv,
  Users,
  Wrench,
} from 'lucide-react';

export interface CategoryIconOption {
  name: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** 全站共享分类图标注册表（Sidebar 与 CategoryModal 共用同一来源） */
export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  { name: 'Folder', label: '文件夹', icon: Folder },
  { name: 'Flame', label: '热门', icon: Flame },
  { name: 'Gamepad2', label: '游戏', icon: Gamepad2 },
  { name: 'FolderArchive', label: '资源库', icon: FolderArchive },
  { name: 'Users', label: '社区', icon: Users },
  { name: 'BookOpen', label: '漫画', icon: BookOpen },
  { name: 'BookMarked', label: '书签', icon: BookMarked },
  { name: 'Film', label: '影片', icon: Film },
  { name: 'Tv', label: '动漫', icon: Tv },
  { name: 'DownloadCloud', label: '下载', icon: DownloadCloud },
  { name: 'Headphones', label: '音频', icon: Headphones },
  { name: 'Library', label: '书库', icon: Library },
  { name: 'FileText', label: '小说', icon: FileText },
  { name: 'Image', label: '美图', icon: Image },
  { name: 'ImageUp', label: '图床', icon: ImageUp },
  { name: 'Clapperboard', label: '影视', icon: Clapperboard },
  { name: 'Sparkles', label: '精选', icon: Sparkles },
  { name: 'Send', label: '频道', icon: Send },
  { name: 'Terminal', label: '开发', icon: Terminal },
  { name: 'Bot', label: 'AI', icon: Bot },
  { name: 'ScanSearch', label: '搜图', icon: ScanSearch },
  { name: 'Wrench', label: '工具', icon: Wrench },
  { name: 'Languages', label: '翻译', icon: Languages },
  { name: 'Mail', label: '邮箱', icon: Mail },
  { name: 'Share2', label: '互传', icon: Share2 },
  { name: 'Globe', label: '网络', icon: Globe },
  { name: 'Puzzle', label: '扩展', icon: Puzzle },
  { name: 'AppWindow', label: '软件', icon: AppWindow },
  { name: 'Briefcase', label: '办公', icon: Briefcase },
  { name: 'Lock', label: '私密', icon: Lock },
];

export const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> =
  Object.fromEntries(CATEGORY_ICON_OPTIONS.map((item) => [item.name, item.icon]));
