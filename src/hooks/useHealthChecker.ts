import { useCallback, useMemo, useState } from 'react';
import type { HealthResult, SiteItem } from '../types';
import { checkSiteHealth } from '../utils/healthCheck';

export function useHealthChecker(
  modeSites: SiteItem[],
  filteredSites: SiteItem[],
  activeSection: string,
  query: string,
  showToast: (msg: string) => void,
) {
  const [healthMap, setHealthMap] = useState<Record<string, HealthResult>>({});
  const [batchChecking, setBatchChecking] = useState<boolean>(false);

  const handleCheckSingle = useCallback(async (site: SiteItem) => {
    setHealthMap((prev) => ({
      ...prev,
      [site.id]: { ...prev[site.id], state: 'checking' },
    }));
    const result = await checkSiteHealth(site.url);
    setHealthMap((prev) => ({
      ...prev,
      [site.id]: result,
    }));
  }, []);

  const handleBatchCheck = useCallback(async () => {
    if (batchChecking) return;
    const targets = activeSection === 'all' && !query.trim() ? modeSites : filteredSites;
    if (targets.length === 0) return;

    setBatchChecking(true);
    showToast(`开始检测 ${targets.length} 个站点的连通性...`);

    const queue = [...targets];
    const concurrency = 6;

    const worker = async () => {
      while (queue.length > 0) {
        const site = queue.shift();
        if (!site) break;
        await handleCheckSingle(site);
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));
    setBatchChecking(false);
    showToast(`已完成 ${targets.length} 个站点的连通性检测`);
  }, [activeSection, batchChecking, filteredSites, handleCheckSingle, modeSites, query, showToast]);

  const healthSummary = useMemo(() => {
    let online = 0;
    let warn = 0;
    let offline = 0;
    for (const s of modeSites) {
      const st = healthMap[s.id]?.state;
      if (st === 'online') online++;
      else if (st === 'warn') warn++;
      else if (st === 'offline') offline++;
    }
    return { online, warn, offline, total: online + warn + offline };
  }, [healthMap, modeSites]);

  return {
    healthMap,
    batchChecking,
    healthSummary,
    handleCheckSingle,
    handleBatchCheck,
  };
}
