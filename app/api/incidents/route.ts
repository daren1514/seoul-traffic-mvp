
import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import proj4 from "proj4";

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  parseTagValue: false,
});

// 서울 중부원점 GRS80 좌표계 (EPSG:5186)
// 서울시 GRS80 중부원점 좌표계
const sourceCRS =
  "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs";

function makeDate(dateValue: unknown, timeValue: unknown) {
  const date = String(dateValue ?? "").replace(/\D/g, "");
  const time = String(timeValue ?? "").replace(/\D/g, "");

  if (date.length !== 8) return null;

  const t = time.padEnd(6, "0");

  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}+09:00`;
}

export async function GET() {
  try {
    const key = process.env.SEOUL_API_KEY;

    if (!key) {
      throw new Error("SEOUL_API_KEY가 설정되지 않았습니다.");
    }

    const url =
      `http://openapi.seoul.go.kr:8088/${key}/xml/AccInfo/1/1000/`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`서울시 API 오류: ${response.status}`);
    }

    const xml = await response.text();
    const parsed = parser.parse(xml);
    const service = parsed.AccInfo;


    if (!service) {
      throw new Error("API 응답 형식을 확인할 수 없습니다.");
    }

    if (service.RESULT?.CODE && service.RESULT.CODE !== "INFO-000") {
      throw new Error(
        service.RESULT.MESSAGE ?? service.RESULT.CODE
      );
    }

    const rawRows = service.row
      ? Array.isArray(service.row)
        ? service.row
        : [service.row]
      : [];

    const now = new Date();

    const incidents = rawRows
      .map((item: Record<string, unknown>) => {
        const start = makeDate(item.occr_date, item.occr_time);
        const end = makeDate(item.exp_clr_date, item.exp_clr_time);

        const x = Number(item.grs80tm_x);
        const y = Number(item.grs80tm_y);

        if (!start || !end || !Number.isFinite(x) || !Number.isFinite(y)) {
          return null;
        }

        const [lng, lat] = proj4(
          sourceCRS,
          "EPSG:4326",
          [x, y]
        );

        // 서울 범위를 벗어나는 좌표는 제외
        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          lat < 37.0 ||
          lat > 38.0 ||
          lng < 126.0 ||
          lng > 128.0
        ) {
          return null;
        }

        const startTime = new Date(start);
        const endTime = new Date(end);

        let status = "통제 예정";

        if (now >= startTime && now <= endTime) {
          status = "통제 중";
        } else if (now > endTime) {
          status = "종료";
        }

        const info = String(item.acc_info ?? "상세정보 없음");

        return {
          id: String(item.acc_id),
          title: info,
          road: "서울시 교통 돌발정보",
          type: String(item.acc_type ?? ""),
          status,
          start,
          end,
          lat,
          lng,
          detail: info,
          source: "서울시 TOPIS",
        };
      })
      .filter(Boolean);

    return NextResponse.json(
  {
    mode: "live",
    updatedAt: now.toISOString(),
    total: incidents.length,
    incidents,
  },
  {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  }
);
  } catch (error) {
    console.error("서울시 교통정보 API 오류:", error);

    return NextResponse.json(
      {
        mode: "error",
        message:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
        incidents: [],
      },
      { status: 500 }
    );
  }
}
