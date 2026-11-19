# Seoul Traffic Timeline (Portfolio MVP)

서울 교통통제 시간축 지도 프로토타입입니다.

## 현재 구현
- 서울 중심 Leaflet 지도
- 데모 통제정보 마커
- 15분 단위 시간 슬라이더 및 재생
- 날짜 선택과 통제 상세정보
- 모바일 반응형 레이아웃

> 현재 데이터는 화면 시연용 샘플입니다. 실제 TOPIS 정보가 아닙니다.

## 실행
```bash
npm install
npm run dev
```
브라우저에서 http://localhost:3000 접속

## 실제 API 연결
1. 서울 열린데이터광장에서 API 인증키를 발급받습니다.
2. `.env.local` 파일을 만들고 아래 값을 설정합니다.
   `SEOUL_API_KEY=발급받은_인증키`
3. `app/api/incidents/route.ts`에서 공식 API의 최신 응답 형식에 맞춰 fetch 및 데이터 변환을 구현합니다.
4. 키는 클라이언트 컴포넌트에 전달하지 마세요. 서버 라우트에서만 사용하세요.

## Vercel 배포
1. 프로젝트를 GitHub 저장소에 push
2. Vercel에서 Add New → Project → GitHub 저장소 Import
3. Deploy 클릭
4. 발급된 `*.vercel.app` URL을 확인
5. 실제 API 연결 후 Vercel Project Settings → Environment Variables에 `SEOUL_API_KEY` 등록 후 재배포

## 데이터 신뢰성
- 샘플 데이터와 실제 공식 데이터를 UI에서 반드시 구분합니다.
- 공식 데이터에 없는 과거 통제정보를 실제 기록처럼 표시하지 않습니다.
- API 갱신 실패 시 통제 없음으로 오인되지 않도록 오류/갱신 시각을 표시합니다.
