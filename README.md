# STABLEFORD

멀티플레이어 Stableford 실시간 스코어보드.

## 화면

| URL | 역할 |
|-----|------|
| `/` | 라운드 목록 / 생성 |
| `/r/[slug]` | 공개 리더보드 (1–3위 실시간) |
| `/r/[slug]/admin` | Admin: 코스·플레이어·조·전체 스코어 |
| `/r/[slug]/g/A` | A조 스코어 입력 (해당 조만, 스코어만 수정) |

- **사진 OCR**: Admin의 코스(Par/SI) 설정에서만 사용
- **조 화면**: 자기 조 플레이어의 핸디캡/스코어만 표시, 스코어만 수정
- **동기화**: 약 1.5초 폴링으로 전체 화면 실시간 반영

## 로컬 실행

```bash
npm install
npm run dev
```

기본 Admin PIN: `admin` (`ADMIN_PIN` 환경변수로 변경)

로컬은 `.data/rounds.json` 파일 스토어를 사용합니다.

## 프로덕션 (Vercel)

1. Vercel에 GitHub `DublinAjae/stableford` 연결
2. 프로젝트에서 **Storage → Blob** 활성화 (`BLOB_READ_WRITE_TOKEN` 자동 주입)
3. 환경변수:

```
ADMIN_PIN=your-pin
ADMIN_SECRET=long-random-string
```

선택: Supabase를 쓰면 Blob 대신 DB+Realtime을 사용합니다. `supabase/schema.sql` 실행 후:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Stableford

`points = max(0, 2 + (par − net))`, `net = gross − strokes`  
스트로크는 Course Handicap + Stroke Index로 배분합니다.
