# gdd

# 청운시 부동산 연대기

빌드가 필요 없는 브라우저용 게임. 정적 호스트에 `dist/`를 배포하면 실행됩니다.
앱은 진행 상태를 해당 브라우저의 localStorage에 저장합니다.

- `dist/app.js` — 지도, 메뉴, 견적, NPC 대화, 거래 기록과 결산
- `dist/engine.js` — 시장 노출, 소유권, 금융, PF, 세금, 분기 정산과 사건
- `dist/city.webp` — 생성한 청운시 지도 배경

기준금리는 2026년 10월 한국은행 ECOS 공표값, 원/달러는 Frankfurter 일별 공표값입니다. 조회 실패 시 날짜가 표시된 저장값을 사용합니다.
세금은 단독명의 개인의 교육용 추정입니다. 취득세·재산세의 일부 세율과 공시가격을 단순화했고, 양도 기본세율과 연간 공제, 종부세 유형별 공제를 구현했습니다. 단기·중과·실거주 비과세 특례와 법인세의 세부 판정은 후속 구현 범위입니다.

## GitHub Pages 배포

1. GitHub에 빈 저장소를 만들고 이 소스의 `main` 브랜치를 푸시합니다. 무료 계정에서 수업용 링크를 공개 배포하려면 공개 저장소를 사용할 수 있습니다. 비공개 저장소에서 Pages를 사용하려면 지원 요금제를 확인하세요.
2. 저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택합니다.
3. **Actions → Deploy Cheongun City to GitHub Pages → Run workflow**에서 `main`을 실행합니다. 첫 배포 이후에는 `main`에 푸시하면 자동으로 갱신됩니다.
4. 배포가 끝나면 **Settings → Pages**에 표시된 주소를 공유합니다. 프로젝트 사이트의 기본 주소는 `https://<계정>.github.io/<저장소>/`입니다.

공개 파일은 `dist/` 안에 있습니다. 게임은 저장소 하위 경로에서 동작하도록 상대경로로 리소스를 불러옵니다. 진행 상태는 브라우저 주소별로 저장되므로 기존 Sites 주소에서 저장한 게임은 GitHub Pages 주소로 자동 이동하지 않습니다.

### 로컬 실행

```sh
python3 -m http.server 8000 --directory dist
```

브라우저에서 `http://localhost:8000/`을 엽니다.
