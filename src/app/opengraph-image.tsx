import { ImageResponse } from "next/og";

export const alt = "Hoho.xo — Anonymous 3D ASCII Christmas Tree & QR Notes";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const HERO_TREE_TIERS = [
  "*",
  "/ * \\",
  "/ o  ~  \\",
  "/ *  @  o \\",
  "/ ~  *  +  o \\",
  "/ o  *  ~  @  * \\",
  "/ *  ~  o  *  +  \\",
  "|||  |||",
];

export default async function Image() {
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
        backgroundImage:
          "radial-gradient(circle at 78% 45%, rgba(245, 196, 81, 0.2), rgba(11, 13, 18, 0) 56%), radial-gradient(circle at 18% 18%, rgba(52, 211, 153, 0.14), rgba(11, 13, 18, 0) 48%)",
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
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 18px",
              borderRadius: "999px",
              border: "1px solid #34D399",
              backgroundColor: "rgba(18, 22, 31, 0.85)",
              color: "#34D399",
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
            3D ASCII Tree · Anonymous Notes
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
              fontSize: "58px",
              fontWeight: 800,
              lineHeight: 1.08,
              color: "#F8F4EB",
              letterSpacing: "-0.02em",
            }}
          >
            Hang anonymous ornaments on your tree.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "27px",
              lineHeight: 1.38,
              color: "#D8D2C6",
              maxWidth: "600px",
            }}
          >
            Share your personal QR code or bio link on IG Stories &amp; socials.
            Friends leave secret holiday notes.
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
          <div style={{ display: "flex", color: "#F4D160" }}>
            Create your tree in seconds
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
        {HERO_TREE_TIERS.map((row, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              fontFamily: "monospace",
              fontSize:
                idx === 0
                  ? "34px"
                  : idx === HERO_TREE_TIERS.length - 1
                    ? "22px"
                    : "24px",
              fontWeight: 700,
              color:
                idx === 0
                  ? "#F4D160"
                  : idx === HERO_TREE_TIERS.length - 1
                    ? "#A67C52"
                    : idx % 2 === 1
                      ? "#7EF5AC"
                      : "#429E70",
              letterSpacing: "0.08em",
            }}
          >
            {row}
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  );
}
