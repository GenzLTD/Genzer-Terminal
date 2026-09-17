import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/governance/proposals?status=voting&limit=20&offset=0
 * 查询治理提案（所有人可读）
 *
 * POST /api/governance/proposals
 * 创建治理提案（仅付费用户：basic/pro）
 *
 * 请求体：
 *   title: 提案标题
 *   description: 提案描述
 *   proposal_type: 提案类型（feature/config_change/community_rule/funding/other）
 *   voting_duration_days: 投票持续天数（默认7天）
 *   execution_data?: 提案通过后的自动执行参数
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const proposalType = searchParams.get("proposal_type");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("governance_proposals")
      .select(`
        id,
        proposer_id,
        title,
        description,
        proposal_type,
        status,
        voting_ends_at,
        execution_data,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }
    if (proposalType) {
      query = query.eq("proposal_type", proposalType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 提案人信息改为独立批量查询。
    // 此前的嵌套 join（profiles:proposer_id(...)）依赖数据库外键关系，
    // Supabase 项目缺少该 FK 时 PostgREST schema cache 解析失败 → 整个接口 500（P0-4）。
    // 拆开查询不依赖 schema 关系，且失败时仅降级为无提案人信息，不再炸整个列表。
    const proposerIds = [...new Set((data || []).map((p: Record<string, unknown>) => p.proposer_id as string).filter(Boolean))];
    const profilesById: Record<string, { username: string | null; display_name: string | null }> = {};
    if (proposerIds.length > 0) {
      const { data: proposerProfiles } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .in("id", proposerIds);
      for (const p of proposerProfiles || []) {
        profilesById[p.id] = { username: p.username, display_name: p.display_name };
      }
    }

    // 为每个提案附上投票统计
    const proposalsWithStats = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data || []).map(async (proposal: Record<string, any>) => {
        const { data: votes } = await supabase
          .from("governance_votes")
          .select("vote, weight")
          .eq("proposal_id", proposal.id);

        const stats = (votes || []).reduce(
          (acc: { for_count: number; for_weight: number; against_count: number; against_weight: number; abstain_count: number; total_count: number; total_weight: number }, v: Record<string, unknown>) => {
            if (v.vote === "for") {
              acc.for_count += 1;
              acc.for_weight += Number(v.weight);
            } else if (v.vote === "against") {
              acc.against_count += 1;
              acc.against_weight += Number(v.weight);
            } else {
              acc.abstain_count += 1;
            }
            acc.total_count += 1;
            acc.total_weight += Number(v.weight);
            return acc;
          },
          {
            for_count: 0,
            against_count: 0,
            abstain_count: 0,
            total_count: 0,
            for_weight: 0,
            against_weight: 0,
            total_weight: 0,
          }
        );

        return {
          ...proposal,
          // 保持与原嵌套 join 相同的返回形状（profiles 为单个对象）
          profiles: profilesById[proposal.proposer_id] ?? null,
          vote_stats: stats,
        };
      })
    );

    return NextResponse.json({ proposals: proposalsWithStats, limit, offset });
  } catch (err) {
    console.error("[governance/proposals] GET error:", err);
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 检查用户档位——仅付费用户可发起提案
    const { data: tierData } = await supabase
      .from("user_tiers")
      .select("tier")
      .eq("user_id", user.id)
      .single();

    const tier = tierData?.tier || "free";
    if (tier === "free") {
      return NextResponse.json(
        {
          error: "governance_requires_paid_tier",
          message:
            "治理参与需要升级到 Basic 或 Pro 版本。免费版可查看提案，但无法发起或投票。",
          upgrade_url: "/pricing",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      proposal_type,
      voting_duration_days = 7,
      execution_data = {},
    } = body;

    if (!title || !description || !proposal_type) {
      return NextResponse.json(
        { error: "title, description, and proposal_type are required" },
        { status: 400 }
      );
    }

    const validTypes = [
      "feature",
      "config_change",
      "community_rule",
      "funding",
      "other",
    ];
    if (!validTypes.includes(proposal_type)) {
      return NextResponse.json(
        {
          error: `invalid proposal_type, must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const votingEndsAt = new Date();
    votingEndsAt.setDate(votingEndsAt.getDate() + voting_duration_days);

    const { data, error } = await supabase
      .from("governance_proposals")
      .insert({
        proposer_id: user.id,
        title,
        description,
        proposal_type,
        voting_ends_at: votingEndsAt.toISOString(),
        execution_data,
      })
      .select()
      .single();

    if (error) {
      console.error("[governance/proposals] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ proposal: data }, { status: 201 });
  } catch (err) {
    console.error("[governance/proposals] POST error:", err);
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }
}
