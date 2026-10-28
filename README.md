# STABLEFORD

스코어카드 사진을 업로드하면 무료 OCR(Tesseract.js)로 읽고 Stableford 점수를 계산합니다.

## Features

- 스코어카드 이미지 업로드 (모바일 카메라 촬영 지원)
- 브라우저 로컬 OCR — API 키 불필요
- Course Handicap + Stroke Index 기반 네트/포인트 계산
- OCR 결과를 홀별로 직접 수정 가능
- 수동 입력 모드

## Stableford points

`points = max(0, 2 + (par − net))` where `net = gross − strokes received`.

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

Vercel에 `DublinAjae/stableford`를 연결하면 바로 배포됩니다.
