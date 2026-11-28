import { ImageResponse } from "next/og";
import { getTreeRecord, toPublicTreeData } from "@/lib/server-store";
import { parseHandle } from "@/lib/tree-config";
import { TREE_THEMES } from "@/lib/tree-themes";

export const alt = "Hoho.xo — Anonymous Christmas Tree";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const TREE_ASCII_TIERS = [
  "*",
  "/ * \\",
  "/ o  ~  \\",
  "/ *  @  o \\",
  "/ ~  *  +  o \\",
  "/ o  *  ~  @  * \\",
  "/ *  ~  o  *  +  \\ ",
  "|||  |||",
];

export default async function Image({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const cleanHandle = parseHandle(handle);
  const record = cleanHandle ? await getTreeRecord(cleanHandle) : null;
  const publicTree = cleanHandle
    ? toPublicTreeData(record ?? cleanHandle)
    : null;
  const theme =
    (publicTree ? TREE_THEMES[publicTree.config.themeId] : undefined) ??
    TREE_THEMES.classic;
  const ornamentCount = publicTree ? publicTree.totalVisible : 0;
  const primaryColor = theme.foliage[3] ?? "#34D399";
  const secondaryColor = theme.foliage[2] ?? theme.swatch;
  const accentColor = theme.star ?? "#F4D160";
  const glowColor = `${theme.swatch}33`;
  const heading = publicTree ? `@${publicTree.handle}` : "Hoho.xo";
  const subheading =
    publicTree?.config.prompt ||
    "Send an anonymous holiday note to hang on a 3D ASCII Christmas tree.";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        justifyContent: "space-between",
        padding: "54px 64px",
        backgroundColor: "#0B0D12",
        backgroundImage: `radial-gradient(circle at 78% 45%, ${glowColor}, rgba(11, 13, 18, 0) 56%), radial-gradient(circle at 18% 18%, rgba(52, 211, 153, 0.14), rgba(11, 13, 18, 0) 48%)`,
        color: "#F6F2E9",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "62%",
          paddingRight: "32px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 18px",
              borderRadius: "999px",
              border: `1px solid ${primaryColor}`,
              backgroundColor: "rgba(18, 22, 31, 0.85)",
              color: primaryColor,
              fontSize: "20px",
              fontWeight: 700,
              letterSpacing: "0.06em",
            }}
          >
            HOHO.XO
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 16px",
              borderRadius: "999px",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              color: "#CFC8BA",
              fontSize: "19px",
              fontWeight: 500,
            }}
          >
            {theme.label} · {ornamentCount}{" "}
            {ornamentCount === 1 ? "ornament" : "ornaments"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "62px",
              fontWeight: 800,
              lineHeight: 1.08,
              color: "#F8F4EB",
              letterSpacing: "-0.02em",
            }}
          >
            {heading}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "30px",
              lineHeight: 1.38,
              color: "#D8D2C6",
              maxWidth: "600px",
            }}
          >
            {subheading}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            paddingTop: "22px",
            fontSize: "20px",
            color: "#A49E92",
          }}
        >
          <div style={{ display: "flex", color: accentColor }}>
            Scan or tap to leave an anonymous holiday note
          </div>
          <div style={{ display: "flex" }}>made by noodlestack</div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "34%",
          borderRadius: "28px",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          backgroundColor: "rgba(15, 19, 28, 0.9)",
          padding: "28px",
          gap: "10px",
        }}
      >
        {TREE_ASCII_TIERS.map((row, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              fontFamily: "monospace",
              fontSize:
                idx === 0
                  ? "34px"
                  : idx === TREE_ASCII_TIERS.length - 1
                    ? "22px"
                    : "24px",
              fontWeight: 700,
              color:
                idx === 0
                  ? accentColor
                  : idx === TREE_ASCII_TIERS.length - 1
                    ? "#A67C52"
                    : idx % 2 === 1
                      ? primaryColor
                      : secondaryColor,
              letterSpacing: "0.08em",
            }}
          >
            {row}
          </div>
        ))}
      </div>
    </div>,
    {
      ...size,
    },
  );
}
