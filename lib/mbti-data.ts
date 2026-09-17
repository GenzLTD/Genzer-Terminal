/**
 * MBTI 类型描述数据 —— 用于 SEO 落地页
 * 每种类型包含：中文名、别名、核心特质、优势、适合职业、匹配类型
 */
export const MBTI_DATA: Record<
  string,
  {
    name: string;
    nickname: string;
    traits: string[];
    strengths: string;
    careers: string;
    matches: string[];
    description: string;
    color: string;
  }
> = {
  INTJ: {
    name: "建筑师",
    nickname: "策略家",
    traits: ["独立", "战略性", "果断", "创新"],
    strengths: "擅长长期规划和系统化思考，能将复杂问题拆解为可执行的方案",
    careers: "战略顾问、架构师、科学家、投资分析师",
    matches: ["ENFP", "ENTP"],
    description:
      "INTJ 是罕见的战略型人格，仅占人口约 2%。他们以独立思考和对知识的渴望著称，善于制定长期计划并坚定执行。在 Genzer Terminal 的共识社区中，INTJ 常常是提出系统性方案的治理参与者。",
    color: "#5B5EA6",
  },
  INTP: {
    name: "逻辑学家",
    nickname: "思考者",
    traits: ["分析性", "好奇", "抽象", "客观"],
    strengths: "拥有强大的逻辑分析能力，善于发现事物间隐藏的规律",
    careers: "程序员、研究员、数据科学家、哲学家",
    matches: ["ENTJ", "ENFJ"],
    description:
      "INTP 是追求真理的逻辑探索者，他们的大脑是一台永不停歇的分析引擎。INTP 热衷于理解世界运转的底层逻辑，在 Genzer Terminal 中，他们常常是深度讨论的发起者。",
    color: "#7B68AE",
  },
  ENTJ: {
    name: "指挥官",
    nickname: "领袖",
    traits: ["决断", "效率", "领导力", "远见"],
    strengths: "天生的领导者，善于组织资源和推动变革",
    careers: "CEO、律师、创业者、项目总监",
    matches: ["INFP", "INTP"],
    description:
      "ENTJ 是天生的领袖，善于制定战略并带领团队实现目标。他们果断、高效，在 Genzer Terminal 的社区治理中，ENTJ 常常是最积极的提案发起者。",
    color: "#C0392B",
  },
  ENTP: {
    name: "辩论家",
    nickname: "创新者",
    traits: ["机敏", "创新", "直言", "好奇"],
    strengths: "善于从多角度审视问题，是优秀的头脑风暴伙伴",
    careers: "创业者、产品经理、记者、咨询顾问",
    matches: ["INFJ", "INTJ"],
    description:
      "ENTP 是充满创意的挑战者，他们享受智力激荡，善于发现常规之外的可能性。在 Genzer Terminal 中，ENTP 是社区讨论中最活跃的火花。",
    color: "#E67E22",
  },
  INFJ: {
    name: "提倡者",
    nickname: "洞察者",
    traits: ["理想主义", "洞察力", "共情", "坚定"],
    strengths: "拥有深层的洞察力和强烈的使命感，善于理解他人内心",
    careers: "心理咨询师、作家、社工、教育家",
    matches: ["ENTP", "ENFP"],
    description:
      "INFJ 是最稀有的人格类型之一，仅占约 1%。他们兼具理想主义和行动力，在 Genzer Terminal 的共识社区中，INFJ 常常是精神领袖般的存在。",
    color: "#27AE60",
  },
  INFP: {
    name: "调停者",
    nickname: "理想主义者",
    traits: ["理想主义", "共情", "创造", "内省"],
    strengths: "拥有丰富的内心世界和强烈的价值观，善于用创意表达自我",
    careers: "作家、设计师、心理咨询师、艺术家",
    matches: ["ENTJ", "ENFJ"],
    description:
      "INFP 是温柔的理想主义者，他们以强烈的内在价值观导航人生。在 Genzer Terminal 中，INFP 常常是社区文化的守护者和最真诚的倾听者。",
    color: "#2ECC71",
  },
  ENFJ: {
    name: "主人公",
    nickname: "导师",
    traits: ["魅力", "利他", "组织力", "感染力"],
    strengths: "天生的导师和激励者，善于连接人与人之间的情感纽带",
    careers: "教师、HR、社工、公关",
    matches: ["INTP", "INFP"],
    description:
      "ENFJ 是天生的连接者，他们善于感知他人需求并创造共鸣。在 Genzer Terminal 的共识社区中，ENFJ 是最有感染力的社区组织者。",
    color: "#E84393",
  },
  ENFP: {
    name: "竞选者",
    nickname: "自由灵魂",
    traits: ["热情", "创意", "社交", "随性"],
    strengths: "充满感染力的热情，善于发现人际间隐藏的联系",
    careers: "记者、演员、创业者、创意总监",
    matches: ["INTJ", "INFJ"],
    description:
      "ENFP 是充满活力的自由灵魂，他们用热情点燃周围的每一个人。在 Genzer Terminal 中，ENFP 是社交裂变的核心引擎。",
    color: "#F39C12",
  },
  ISTJ: {
    name: "物流师",
    nickname: "执行者",
    traits: ["可靠", "务实", "有序", "负责"],
    strengths: "高度的责任感和执行力，是团队中最可靠的基石",
    careers: "审计师、工程师、公务员、项目经理",
    matches: ["ESFP", "ESTP"],
    description:
      "ISTJ 是最可靠的人格类型之一，他们以务实和责任心著称。在 Genzer Terminal 的社区治理中，ISTJ 是提案执行的保障。",
    color: "#2C3E50",
  },
  ISFJ: {
    name: "守卫者",
    nickname: "守护者",
    traits: ["温暖", "忠诚", "细心", "谦逊"],
    strengths: "默默守护他人的温暖力量，是社区中最可靠的支撑",
    careers: "护士、教师、行政、社工",
    matches: ["ESTP", "ESFP"],
    description:
      "ISFJ 是温暖而忠诚的守护者，他们默默为社区付出。在 Genzer Terminal 中，ISFJ 是社区凝聚力的基石。",
    color: "#16A085",
  },
  ESTJ: {
    name: "总经理",
    nickname: "组织者",
    traits: ["高效", "务实", "直接", "有组织"],
    strengths: "极强的组织力和执行力，善于将混乱变为秩序",
    careers: "管理者、军官、律师、财务总监",
    matches: ["ISFP", "ISTP"],
    description:
      "ESTJ 是天生的高效组织者，他们善于制定规则并确保执行。在 Genzer Terminal 的社区治理中，ESTJ 是制度建设的推动者。",
    color: "#C0392B",
  },
  ESFJ: {
    name: "执政官",
    nickname: "社交家",
    traits: ["友善", "合作", "热心", "传统"],
    strengths: "天生的社交桥梁，善于营造和谐的氛围",
    careers: "教师、HR、医疗、销售",
    matches: ["ISTP", "ISFP"],
    description:
      "ESFJ 是温暖而务实的社交家，他们天生善于照顾他人需求。在 Genzer Terminal 中，ESFJ 是社区氛围的营造者。",
    color: "#D35400",
  },
  ISTP: {
    name: "鉴赏家",
    nickname: "手艺人",
    traits: ["冷静", "实际", "灵活", "独立"],
    strengths: "极强的动手能力和问题解决能力，擅长临场应变",
    careers: "工程师、飞行员、侦探、外科医生",
    matches: ["ESFJ", "ESTJ"],
    description:
      "ISTP 是冷静而灵活的问题解决者，他们善于在压力下找到实用的解决方案。在 Genzer Terminal 中，ISTP 是技术讨论的中坚力量。",
    color: "#34495E",
  },
  ISFP: {
    name: "探险家",
    nickname: "艺术家",
    traits: ["敏感", "和善", "灵活", "审美"],
    strengths: "拥有独特的审美视角和创造力，善于用行动表达自我",
    careers: "设计师、音乐家、摄影师、厨师",
    matches: ["ESTJ", "ESFJ"],
    description:
      "ISFP 是安静而富有创造力的艺术家，他们用行动而非言语表达自我。在 Genzer Terminal 中，ISFP 为社区带来独特的美学视角。",
    color: "#1ABC9C",
  },
  ESTP: {
    name: "企业家",
    nickname: "行动派",
    traits: ["大胆", "实际", "直接", "精力充沛"],
    strengths: "极强的行动力和临场应变能力，善于抓住机会",
    careers: "企业家、销售、运动员、急救人员",
    matches: ["ISFJ", "ISTJ"],
    description:
      "ESTP 是充满活力的行动派，他们善于在现实中找到机会并果断出击。在 Genzer Terminal 中，ESTP 是社区活动的推动者。",
    color: "#E74C3C",
  },
  ESFP: {
    name: "表演者",
    nickname: "乐天派",
    traits: ["热情", "自发", "慷慨", "活力"],
    strengths: "天生的氛围担当，善于让周围的人感到快乐",
    careers: "演员、导游、活动策划、销售",
    matches: ["ISTJ", "ISFJ"],
    description:
      "ESFP 是充满热情的乐天派，他们天生善于营造快乐氛围。在 Genzer Terminal 中，ESFP 是社区活力的源泉。",
    color: "#FF6B6B",
  },
};

/** 16 种 MBTI 类型列表 */
export const MBTI_TYPES = Object.keys(MBTI_DATA);

/** 四维度分组 */
export const MBTI_GROUPS = {
  analysts: { name: "分析家", types: ["INTJ", "INTP", "ENTJ", "ENTP"], color: "#7B68AE" },
  diplomats: { name: "外交家", types: ["INFJ", "INFP", "ENFJ", "ENFP"], color: "#27AE60" },
  sentinels: { name: "守护者", types: ["ISTJ", "ISFJ", "ESTJ", "ESFJ"], color: "#2C3E50" },
  explorers: { name: "探险家", types: ["ISTP", "ISFP", "ESTP", "ESFP"], color: "#E67E22" },
};
