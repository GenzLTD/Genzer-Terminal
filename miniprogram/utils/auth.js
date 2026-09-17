/**
 * Genzer Terminal 小程序 — 权限管理
 * 借鉴 iot-smart-control 的 utils/auth.js 权限矩阵
 *
 * 权限等级映射：
 *   iot:      OWNER → ADMIN → MEMBER → GUEST
 *   Genzer:   founder → paid → free → visitor
 *
 * 功能定义：
 *   visitor: 只能看登录页
 *   free:    社区成员 — 发现同道、创建名片、互动、积累声誉(链下)
 *   paid:    治理参与者 — 声誉上链、提案投票、加权投票
 *   founder: 创始人 — 所有权限 + 管理后台
 */

const { getUserTier } = require('./storage');

/**
 * 权限等级数值
 */
const TIER_LEVELS = {
  visitor: 0,
  free: 1,
  paid: 2,
  founder: 3,
};

/**
 * 功能权限矩阵
 * true = 允许，false = 禁止
 */
const PERMISSIONS = {
  // ===== 基础功能 =====
  viewDiscover: { visitor: false, free: true, paid: true, founder: true },
  viewProfile: { visitor: false, free: true, paid: true, founder: true },
  createCard: { visitor: false, free: true, paid: true, founder: true },
  editOwnProfile: { visitor: false, free: true, paid: true, founder: true },
  interactLike: { visitor: false, free: true, paid: true, founder: true },
  interactComment: { visitor: false, free: true, paid: true, founder: true },
  consensusMatch: { visitor: false, free: true, paid: true, founder: true },

  // ===== 社交功能 =====
  followUser: { visitor: false, free: true, paid: true, founder: true },
  shareCard: { visitor: false, free: true, paid: true, founder: true },
  inviteUser: { visitor: false, free: true, paid: true, founder: true },

  // ===== 治理功能（核心差异化）=====
  viewProposals: { visitor: false, free: true, paid: true, founder: true },
  createProposal: { visitor: false, free: false, paid: true, founder: true },
  voteOnProposal: { visitor: false, free: false, paid: true, founder: true },
  delegateVote: { visitor: false, free: false, paid: true, founder: true },
  viewVoteResults: { visitor: false, free: true, paid: true, founder: true },

  // ===== 声誉系统 =====
  earnReputation: { visitor: false, free: true, paid: true, founder: true },
  onChainReputation: { visitor: false, free: false, paid: true, founder: true },
  earnSBTBadge: { visitor: false, free: false, paid: true, founder: true },
  viewReputation: { visitor: false, free: true, paid: true, founder: true },

  // ===== AI 功能 =====
  aiJobMatch: { visitor: false, free: false, paid: true, founder: true },

  // ===== 管理功能 =====
  adminPanel: { visitor: false, free: false, paid: false, founder: true },
  manageUsers: { visitor: false, free: false, paid: false, founder: true },
  manageProposals: { visitor: false, free: false, paid: false, founder: true },
};

/**
 * 检查当前用户是否有某项权限
 * @param {string} permission - 权限名称（如 'createProposal'）
 * @param {string} [tier] - 可选，指定 tier，默认取当前用户 tier
 * @returns {boolean}
 */
function hasPermission(permission, tier) {
  const userTier = tier || getUserTier();
  const perm = PERMISSIONS[permission];

  if (!perm) {
    console.warn(`[Auth] 未知权限: ${permission}`);
    return false;
  }

  return !!perm[userTier];
}

/**
 * 检查用户等级是否达到指定等级
 * @param {string} requiredTier - 要求的最低等级
 * @param {string} [tier] - 可选，指定 tier
 * @returns {boolean}
 */
function isTierOrAbove(requiredTier, tier) {
  const userTier = tier || getUserTier();
  return (TIER_LEVELS[userTier] || 0) >= (TIER_LEVELS[requiredTier] || 0);
}

/**
 * 判断用户是否为治理参与者（paid 及以上）
 */
function isGovernor(tier) {
  return isTierOrAbove('paid', tier);
}

/**
 * 获取当前用户缺少的升级提示
 * 用于前端展示"升级以解锁"提示
 */
function getUpgradeHint(permission) {
  const perm = PERMISSIONS[permission];
  if (!perm) return '';

  if (perm.free && !perm.visitor) return '注册后即可使用';
  if (perm.paid && !perm.free) return '升级为治理参与者后即可使用';
  if (perm.founder && !perm.paid) return '仅创始人可使用';
  return '';
}

/**
 * 获取治理权限列表（用于 H5 端判断）
 */
function getGovernancePermissions() {
  const tier = getUserTier();
  return Object.keys(PERMISSIONS).filter(key => hasPermission(key, tier));
}

module.exports = {
  TIER_LEVELS,
  PERMISSIONS,
  hasPermission,
  isTierOrAbove,
  isGovernor,
  getUpgradeHint,
  getGovernancePermissions,
};
