import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// MBTI 类型对应的颜色方案（主色 + 浅色背景）
const MBTI_COLORS: Record<string, { primary: string; bg: string; accent: string }> = {
  INTJ: { primary: "#5B5EA6", bg: "#E8E8F4", accent: "#7B7EC6" },
  INTP: { primary: "#7B68AE", bg: "#EDE8F5", accent: "#9B88CE" },
  ENTJ: { primary: "#C0392B", bg: "#F8E8E6", accent: "#E05A4C" },
  ENTP: { primary: "#E67E22", bg: "#FBF0E4", accent: "#F0983A" },
  INFJ: { primary: "#27AE60", bg: "#E4F5EC", accent: "#4DC882" },
  INFP: { primary: "#2ECC71", bg: "#E8F8EE", accent: "#5ED99A" },
  ENFJ: { primary: "#E84393", bg: "#FCE8F1", accent: "#F06AAB" },
  ENFP: { primary: "#F39C12", bg: "#FDF2E0", accent: "#F5B041" },
  ISTJ: { primary: "#2C3E50", bg: "#E4E8EC", accent: "#4A6278" },
  ISFJ: { primary: "#16A085", bg: "#E2F3EE", accent: "#3ABFA0" },
  ESTJ: { primary: "#C0392B", bg: "#F8E8E6", accent: "#E05A4C" },
  ESFJ: { primary: "#D35400", bg: "#FAEBE4", accent: "#E87A3A" },
  ISTP: { primary: "#34495E", bg: "#E6E9EC", accent: "#5A6E82" },
  ISFP: { primary: "#1ABC9C", bg: "#E2F6F0", accent: "#48D6B6" },
  ESTP: { primary: "#E74C3C", bg: "#FBE8E6", accent: "#F07060" },
  ESFP: { primary: "#FF6B6B", bg: "#FFE8E8", accent: "#FF8888" },
};

const DEFAULT_COLORS = { primary: "#5B5EA6", bg: "#F0F0F5", accent: "#7B7EC6" };

// MBTI 四维度标签
function getMBTIDimensions(mbtiType: string): { dim: string; label: string }[] {
  if (!mbtiType || mbtiType.length !== 4) return [];
  const dims = [
    { letter: mbtiType[0], pair: "EI", labels: { E: "外向", I: "内向" } },
    { letter: mbtiType[1], pair: "SN", labels: { S: "实感", N: "直觉" } },
    { letter: mbtiType[2], pair: "TF", labels: { T: "思维", F: "情感" } },
    { letter: mbtiType[3], pair: "JP", labels: { J: "判断", P: "知觉" } },
  ];
  return dims.map((d) => ({
    dim: d.letter,
    label: d.labels[d.letter as keyof typeof d.labels] ?? d.letter,
  }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const mbtiType = searchParams.get("mbti")?.toUpperCase() ?? "";
  const name = searchParams.get("name") ?? username ?? "匿名用户";
  const city = searchParams.get("city") ?? "";
  const manifesto = searchParams.get("manifesto") ?? "";
  const values = searchParams.get("values") ?? "";
  const interests = searchParams.get("interests") ?? "";

  const colors = MBTI_COLORS[mbtiType] ?? DEFAULT_COLORS;
  const dimensions = getMBTIDimensions(mbtiType);
  const valueList = values ? values.split(",").slice(0, 5) : [];
  const interestList = interests ? interests.split(",").slice(0, 4) : [];
  const shortManifesto = manifesto.length > 60 ? manifesto.slice(0, 57) + "..." : manifesto;

  // Generate SVG avatar initial
  const initial = name.charAt(0).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(135deg, ${colors.bg} 0%, #FFFFFF 40%, #FFFFFF 60%, ${colors.bg} 100%)`,
          padding: "48px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top bar: branding + MBTI badge */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "32px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: colors.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "18px",
                fontWeight: 700,
              }}
            >
              D
            </div>
            <span style={{ fontSize: "20px", fontWeight: 600, color: "#1a1a2e" }}>
              Genzer
            </span>
            <span style={{ fontSize: "14px", color: "#888", marginLeft: "4px" }}>
              共识网络
            </span>
          </div>
          {mbtiType && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: colors.primary,
                borderRadius: "20px",
                padding: "8px 20px",
                color: "white",
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "2px",
              }}
            >
              {mbtiType}
            </div>
          )}
        </div>

        {/* Main content area */}
        <div style={{ display: "flex", gap: "40px", flex: 1 }}>
          {/* Left: Avatar + Name + City + Dimensions */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: "220px",
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "60px",
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "48px",
                fontWeight: 700,
                boxShadow: `0 8px 32px ${colors.primary}33`,
                marginBottom: "16px",
              }}
            >
              {initial}
            </div>

            {/* Name */}
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#1a1a2e", marginBottom: "4px" }}>
              {name}
            </div>

            {/* City */}
            {city && (
              <div style={{ fontSize: "16px", color: "#888", marginBottom: "16px" }}>
                {city}
              </div>
            )}

            {/* MBTI Dimensions */}
            {dimensions.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  justifyContent: "center",
                }}
              >
                {dimensions.map((d) => (
                  <div
                    key={d.dim}
                    style={{
                      background: `${colors.primary}18`,
                      border: `1px solid ${colors.primary}40`,
                      borderRadius: "12px",
                      padding: "6px 14px",
                      fontSize: "14px",
                      color: colors.primary,
                      fontWeight: 600,
                    }}
                  >
                    {d.dim} - {d.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Manifesto + Tags */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "20px",
            }}
          >
            {/* Manifesto */}
            {shortManifesto && (
              <div
                style={{
                  fontSize: "18px",
                  lineHeight: 1.6,
                  color: "#333",
                  fontStyle: "italic",
                  borderLeft: `4px solid ${colors.primary}`,
                  paddingLeft: "16px",
                }}
              >
                &ldquo;{shortManifesto}&rdquo;
              </div>
            )}

            {/* Value tags */}
            {valueList.length > 0 && (
              <div>
                <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px", fontWeight: 600 }}>
                  价值观
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {valueList.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: "#EBF0FF",
                        color: "#4A6FA5",
                        borderRadius: "12px",
                        padding: "6px 14px",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Interest tags */}
            {interestList.length > 0 && (
              <div>
                <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px", fontWeight: 600 }}>
                  兴趣
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {interestList.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: "#F3EAFF",
                        color: "#7B4FA0",
                        borderRadius: "12px",
                        padding: "6px 14px",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom: CTA */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid #E5E7EB",
          }}
        >
          <div style={{ fontSize: "14px", color: "#999" }}>
            找到你的共识圈 → genzer.app/p/{username ?? ""}
          </div>
          <div
            style={{
              background: colors.primary,
              borderRadius: "16px",
              padding: "8px 24px",
              color: "white",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            加入共识社区
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
