"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Download, Copy, Check, Loader2 } from "lucide-react";
import {
  isMiniProgram,
  setShareData as mpSetShareData,
  requestShare as mpRequestShare,
} from "@/lib/miniprogram-bridge";

// MBTI 类型对应的颜色方案
const MBTI_COLORS: Record<string, { primary: string; bg: string }> = {
  INTJ: { primary: "#5B5EA6", bg: "#E8E8F4" },
  INTP: { primary: "#7B68AE", bg: "#EDE8F5" },
  ENTJ: { primary: "#C0392B", bg: "#F8E8E6" },
  ENTP: { primary: "#E67E22", bg: "#FBF0E4" },
  INFJ: { primary: "#27AE60", bg: "#E4F5EC" },
  INFP: { primary: "#2ECC71", bg: "#E8F8EE" },
  ENFJ: { primary: "#E84393", bg: "#FCE8F1" },
  ENFP: { primary: "#F39C12", bg: "#FDF2E0" },
  ISTJ: { primary: "#2C3E50", bg: "#E4E8EC" },
  ISFJ: { primary: "#16A085", bg: "#E2F3EE" },
  ESTJ: { primary: "#C0392B", bg: "#F8E8E6" },
  ESFJ: { primary: "#D35400", bg: "#FAEBE4" },
  ISTP: { primary: "#34495E", bg: "#E6E9EC" },
  ISFP: { primary: "#1ABC9C", bg: "#E2F6F0" },
  ESTP: { primary: "#E74C3C", bg: "#FBE8E6" },
  ESFP: { primary: "#FF6B6B", bg: "#FFE8E8" },
};

const DEFAULT_COLORS = { primary: "#5B5EA6", bg: "#F0F0F5" };

// MBTI 四维度
function getMBTIDimensions(mbtiType: string): { dim: string; label: string }[] {
  if (!mbtiType || mbtiType.length !== 4) return [];
  const dims = [
    { letter: mbtiType[0], labels: { E: "外向", I: "内向" } },
    { letter: mbtiType[1], labels: { S: "实感", N: "直觉" } },
    { letter: mbtiType[2], labels: { T: "思维", F: "情感" } },
    { letter: mbtiType[3], labels: { J: "判断", P: "知觉" } },
  ];
  return dims.map((d) => ({
    dim: d.letter,
    label: d.labels[d.letter as keyof typeof d.labels] ?? d.letter,
  }));
}

interface ShareCardProps {
  username: string;
  name: string;
  mbtiType?: string;
  city?: string;
  manifesto?: string;
  valueTags?: string[];
  interestTags?: string[];
  valueLabels?: Record<string, string>;
  interestLabels?: Record<string, string>;
}

export function ShareCard({
  username,
  name,
  mbtiType = "",
  city = "",
  manifesto = "",
  valueTags = [],
  interestTags = [],
  valueLabels = {},
  interestLabels = {},
}: ShareCardProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inMP, setInMP] = useState(false);

  // 检测是否在小程序环境
  useEffect(() => {
    setInMP(isMiniProgram());
  }, []);

  const colors = MBTI_COLORS[mbtiType] ?? DEFAULT_COLORS;
  const dimensions = getMBTIDimensions(mbtiType);
  const displayValues = valueTags.slice(0, 5).map((id) => valueLabels[id] ?? id);
  const displayInterests = interestTags.slice(0, 4).map((id) => interestLabels[id] ?? id);
  const initial = name.charAt(0).toUpperCase();
  const shortManifesto = manifesto.length > 60 ? manifesto.slice(0, 57) + "..." : manifesto;

  // 构建 OG Image URL
  const ogImageUrl = `/api/og/card?username=${encodeURIComponent(username)}&name=${encodeURIComponent(name)}&mbti=${encodeURIComponent(mbtiType)}&city=${encodeURIComponent(city)}&manifesto=${encodeURIComponent(shortManifesto)}&values=${encodeURIComponent(displayValues.join(","))}&interests=${encodeURIComponent(displayInterests.join(","))}`;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${username}`
      : "";

  // 下载图片
  const handleDownload = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(ogImageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${username}-mbti-card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // fallback: open in new tab
      window.open(ogImageUrl, "_blank");
    } finally {
      setSaving(false);
    }
  }, [ogImageUrl, username]);

  // 复制链接
  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  // 微信分享（复制链接 + 提示在微信打开）
  const handleWechatShare = useCallback(async () => {
    await handleCopyLink();
    alert("链接已复制！请在微信中粘贴分享给朋友，或保存名片图片发到朋友圈。");
  }, [handleCopyLink]);

  // 小程序原生分享
  const handleMPShare = useCallback(() => {
    // 将分享数据发送给小程序原生层
    const fullOgUrl = shareUrl
      ? `${new URL(ogImageUrl, shareUrl).href}`
      : ogImageUrl;
    mpSetShareData({
      title: `我是 ${mbtiType}，来 Genzer Terminal 找到你的共识圈`,
      imageUrl: fullOgUrl,
      mbti: mbtiType,
    });
    mpRequestShare();
  }, [mbtiType, ogImageUrl, shareUrl]);

  // 对话框打开时，提前设置分享数据（postMessage 需要提前发送）
  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && inMP) {
      const fullOgUrl = shareUrl
        ? `${new URL(ogImageUrl, shareUrl).href}`
        : ogImageUrl;
      mpSetShareData({
        title: `我是 ${mbtiType}，来 Genzer Terminal 找到你的共识圈`,
        imageUrl: fullOgUrl,
        mbti: mbtiType,
      });
    }
  }, [inMP, mbtiType, ogImageUrl, shareUrl]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          分享名片
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>分享我的 MBTI 名片</DialogTitle>
        </DialogHeader>

        {/* 卡片预览 */}
        <div className="rounded-xl overflow-hidden border shadow-sm">
          <div
            className="p-6"
            style={{
              background: `linear-gradient(135deg, ${colors.bg} 0%, #FFFFFF 40%, #FFFFFF 60%, ${colors.bg} 100%)`,
            }}
          >
            {/* 顶部品牌 + MBTI 徽章 */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: colors.primary }}
                >
                  G
                </div>
                <span className="text-base font-semibold text-gray-800">Genzer</span>
                <span className="text-xs text-gray-400">共识网络</span>
              </div>
              {mbtiType && (
                <span
                  className="px-4 py-1.5 rounded-full text-white text-base font-bold tracking-wider"
                  style={{ background: colors.primary }}
                >
                  {mbtiType}
                </span>
              )}
            </div>

            {/* 主内容 */}
            <div className="flex gap-6">
              {/* 左侧：头像+名字+维度 */}
              <div className="flex flex-col items-center min-w-[160px]">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-2"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.primary}cc)`,
                    boxShadow: `0 4px 16px ${colors.primary}33`,
                  }}
                >
                  {initial}
                </div>
                <div className="text-lg font-bold text-gray-800">{name}</div>
                {city && <div className="text-sm text-gray-400">{city}</div>}
                {dimensions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
                    {dimensions.map((d) => (
                      <span
                        key={d.dim}
                        className="px-2 py-0.5 rounded-lg text-xs font-medium"
                        style={{
                          background: `${colors.primary}18`,
                          border: `1px solid ${colors.primary}40`,
                          color: colors.primary,
                        }}
                      >
                        {d.dim}-{d.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 右侧：宣言+标签 */}
              <div className="flex-1 space-y-3">
                {shortManifesto && (
                  <div
                    className="text-sm text-gray-600 italic pl-3"
                    style={{ borderLeft: `3px solid ${colors.primary}` }}
                  >
                    &ldquo;{shortManifesto}&rdquo;
                  </div>
                )}
                {displayValues.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-400 font-medium mb-1">价值观</div>
                    <div className="flex flex-wrap gap-1.5">
                      {displayValues.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {displayInterests.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-400 font-medium mb-1">兴趣</div>
                    <div className="flex flex-wrap gap-1.5">
                      {displayInterests.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleDownload}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            保存图片
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleCopyLink}>
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                已复制
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                复制链接
              </>
            )}
          </Button>
          <Button
            variant="default"
            className="gap-2"
            onClick={inMP ? handleMPShare : handleWechatShare}
            style={{ background: "#07C160" }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm3.413 1.94c-1.82-.064-3.763.506-5.26 1.748-1.56 1.295-2.382 3.248-1.647 5.282.67 1.854 2.442 3.255 4.396 3.875 1.966.624 4.187.484 5.913-.504l1.383.81a.326.326 0 0 0 .167.054.295.295 0 0 0 .291-.295c0-.072-.03-.143-.048-.213l-.283-1.074a.59.59 0 0 1 .154-.482C22.542 15.648 24 13.548 24 11.19c0-3.438-3.337-6.247-7.234-6.247-.677 0-1.334.07-1.968.194l.013-.006zm-2.398 2.778c.464 0 .841.383.841.855a.848.848 0 0 1-.841.855.848.848 0 0 1-.841-.855c0-.472.377-.855.841-.855zm4.218 0c.464 0 .841.383.841.855a.848.848 0 0 1-.841.855.848.848 0 0 1-.841-.855c0-.472.377-.855.841-.855z" />
            </svg>
            {inMP ? "分享给朋友" : "微信分享"}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-2">
          保存图片后可在朋友圈、群聊中分享你的 MBTI 名片
        </p>
      </DialogContent>
    </Dialog>
  );
}
