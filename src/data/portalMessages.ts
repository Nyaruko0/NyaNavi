export interface PortalMessage {
  id: string;
  place: string;
  badge: string;
  body: string;
  confirmText: string;
  cancelText: string;
}

export const PORTAL_MESSAGES: PortalMessage[] = [
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
    id: 'chaldea',
    place: '迦勒底',
    badge: '人理延续保障机构',
    body: '灵子转移坐标已锁定「迦勒底」管制室！达·芬奇亲提醒：出发前请检查网速与梯子状态。',
    confirmText: '开始灵子转移',
    cancelText: '取消筐体启动',
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
    id: 'astral-express',
    place: '星穹列车',
    badge: '跃迁倒计时 · 3, 2, 1',
    body: '帕姆播报：下一站跃迁坐标已校准！请抓紧扶手，准备随「星穹列车」前往新世界帕！',
    confirmText: '开始跃迁帕！',
    cancelText: '车厢里再坐会儿',
  },
  {
    id: 'beika',
    place: '米花町',
    badge: '高危区域 · 推理预警',
    body: '前方目的地位于「米花町」，请自觉远离戴黑框眼镜的小学生与密室建筑。仍要前往吗？',
    confirmText: '头铁硬闯',
    cancelText: '珍爱生命，撤退',
  },
  {
    id: 'fuyuki',
    place: '冬木市',
    badge: '夜间巡礼 · 煤气预警',
    body: '今晚的「冬木市」煤气管道看起来不太安分……御主，确认要前往该坐标展开探索吗？',
    confirmText: '以令咒之名，冲！',
    cancelText: '先苟在教堂',
  },
  {
    id: 'konoha',
    place: '木叶隐村',
    badge: '火影岩 · 通灵坐标',
    body: '通灵之术准备完毕！确定要放下手里的一乐拉面，火影跑直奔「木叶隐村」外的新坐标吗？',
    confirmText: '结印出发',
    cancelText: '再吃一碗拉面',
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
  {
    id: 'platform-934',
    place: '异世界九又四分之三站台',
    badge: '次元裂缝 · 特快列车',
    body: '虽然好像串台了，但反正都是异世界！猫头鹰已经叼来「异世界站台」车票，现在闭眼穿墙吗？',
    confirmText: '闭眼冲墙',
    cancelText: '怕撞墙，先等等',
  },
  {
    id: 'holy-land',
    place: '二次元圣地',
    badge: '次元壁厚度 0.01mm',
    body: '前方检测到高浓度精神食粮！次元壁已薄如蝉翼，是否即刻踏上这场「二次元圣地」巡礼？',
    confirmText: '突破次元壁',
    cancelText: '守住理智',
  },
];

export function pickPortalMessage(excludeId?: string): PortalMessage {
  const pool = excludeId
    ? PORTAL_MESSAGES.filter((item) => item.id !== excludeId)
    : PORTAL_MESSAGES;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] ?? PORTAL_MESSAGES[0];
}
