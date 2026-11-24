export interface PortalMessage {
  id: string;
  place: string;
  badge: string;
  body: string;
  confirmText: string;
  cancelText: string;
}

export const PORTAL_MESSAGES: PortalMessage[] = [
  // === Galgame 经典地标 ===
  {
    id: 'hoori',
    place: '穗织镇',
    badge: '温泉乡 · 丛雨丸认证',
    body: '电车已缓缓驶入「穗织镇」！拔出神刀之前请先做好被幼刀吐槽的心理准备，现在就进村吗？',
    confirmText: '进村拔刀！',
    cancelText: '下次再泡温泉',
  },
  {
    id: 'hikarizaka',
    place: '光坂小镇',
    badge: '樱花坡道 · 光玉收集',
    body: '樱花正飘落在「光坂小镇」的坡道上——别忘了备好纸巾，要一起踏上这段新的路线吗？',
    confirmText: '走上坡道',
    cancelText: '先买份早苗面包',
  },
  {
    id: 'torishirojima',
    place: '鸟白岛',
    badge: '濑户内海 · 渡轮靠岸',
    body: '渡轮的汽笛声响起，盛夏的「鸟白岛」就在眼前。暑假才刚刚开始，现在登岛探索吗？',
    confirmText: '骑车环岛去！',
    cancelText: '先打会儿乒乓',
  },
  {
    id: 'okukozome',
    place: '奥木染町',
    badge: '夏日乡间 · 避暑列车',
    body: '蝉鸣声渐渐清晰，通往「奥木染町」的乡间列车即将到站。记得随手反锁玄关门，确认出发吗？',
    confirmText: '下车进镇',
    cancelText: '先吹会儿夏风',
  },
  {
    id: 'houjou',
    place: '峰城大附属学园',
    badge: '初雪降临 · 胃药常备',
    body: '音乐室里隐约传来了《届かない恋》的旋律……确定要在初雪这天踏入「峰城大附属」的修罗场吗？',
    confirmText: '为什么会变成这样呢',
    cancelText: '先吃两片胃药',
  },
  {
    id: 'hinamizawa',
    place: '雏见泽村',
    badge: '绵流祭前夜 · 蝉鸣渐响',
    body: '前方即将进入「雏见泽村」，村里偶有柴刀出没且切勿随便吞下陌生萩饼……仍要前往吗？',
    confirmText: '头铁进村！',
    cancelText: '嘘だ！我溜了',
  },
  {
    id: 'mihama',
    place: '美滨学园',
    badge: '全封闭寄宿制 · 转学通知',
    body: '穿过高耸的校门就是「美滨学园」了。里面全员都是身怀绝技的问题少女，确定要办理转学吗？',
    confirmText: '立刻转学报道',
    cancelText: '我只想当普通人',
  },
  {
    id: 'yumihari',
    place: '弓张市',
    badge: '樱之诗 · 艺术巡礼',
    body: '微风拂过「弓张市」的画室，满城樱花正在纸页间飘落——准备好推开下一扇通往新世界的门了吗？',
    confirmText: '推开画室之门',
    cancelText: '再赏一会儿樱',
  },
  {
    id: 'fuyuki',
    place: '冬木市',
    badge: '夜间巡礼 · 煤气预警',
    body: '今晚的「冬木市」煤气管道看起来不太安分……御主，确认要前往该坐标展开探索吗？',
    confirmText: '以令咒之名，冲！',
    cancelText: '先苟在教堂',
  },

  // === 保留的二次元经典坐标 ===
  {
    id: 'akihabara',
    place: '秋叶原',
    badge: '山手线 · 电气街口',
    body: '电车即将抵达「秋叶原」站！请收好你的通行证，前方高能，小心硬盘和睡眠时间同时蒸发。',
    confirmText: '出站逛街！',
    cancelText: '先回站台',
  },
  {
    id: 'kivotos',
    place: '基沃托斯',
    badge: '夏莱 · 紧急联络',
    body: '老师，来自「基沃托斯」的新坐标已送达！夏莱的日程表先放一放，现在就动身吗？',
    confirmText: '老师这就出发',
    cancelText: '再摸会儿鱼',
  },
  {
    id: 'academy-city',
    place: '学园都市',
    badge: '第七学区 · 闸机校验',
    body: '已通过「学园都市」第七学区校验。风纪委员正在附近巡逻，确定要潜入目标坐标吗？',
    confirmText: '超电磁炮，启动！',
    cancelText: '先装路人',
  },
  {
    id: 'gensokyo',
    place: '幻想乡',
    badge: '博丽大结界 · 隙间通道',
    body: '大结界刚好裂开一道缝隙，对面隐约能看到「幻想乡」的红白巫女……要顺着隙间钻过去吗？',
    confirmText: '钻进隙间',
    cancelText: '怕被退治，溜了',
  },
  {
    id: 'aincrad',
    place: '艾恩葛朗特',
    badge: '浮游城 · 第 1 层',
    body: '神经连接已对准「艾恩葛朗特」——放心，这次右上角有正常的关闭按钮，确定要潜行吗？',
    confirmText: 'Link Start!',
    cancelText: '摘下头盔',
  },
  {
    id: 'teyvat',
    place: '提瓦特大陆',
    badge: '传送锚点 · 已解锁',
    body: '前面的区域现在就能探索！应急食品已经背好行囊，准备直接传送到「提瓦特大陆」新锚点吗？',
    confirmText: '传送锚点',
    cancelText: '下次一定',
  },
  {
    id: 'axel',
    place: '阿克塞尔新手镇',
    badge: '冒险者公会 · 悬赏板',
    body: '爆裂魔法已充能完毕，智障女神正在隔壁欠债——要立刻动身前往「阿克塞尔新手镇」吗？',
    confirmText: 'Explosion! 出发',
    cancelText: '先躲进被窝',
  },
  {
    id: 'tokyo-3',
    place: '第 3 新东京市',
    badge: 'NERV · 弹射轨道',
    body: '同步率 400% 确认！初号机已就位，是否立即沿轨道弹射前往「第 3 新东京市」目标区域？',
    confirmText: '弹射出发！',
    cancelText: '算了，今天不逃也不上',
  },
];

export function pickPortalMessage(excludeId?: string): PortalMessage {
  const pool = excludeId
    ? PORTAL_MESSAGES.filter((item) => item.id !== excludeId)
    : PORTAL_MESSAGES;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] ?? PORTAL_MESSAGES[0];
}
