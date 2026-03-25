# TODO

## Critical

- [x] **Test suite** — Jest + ts-jest kurulumu; her modül için `src/__tests__/` altında unit testler
  - `getChangedFiles` — boş diff, renamed/deleted dosya, geçersiz base ref
  - `buildDependencyGraph` — re-export zinciri, tsconfig fallback, circular dependency, dynamic import kenarları
  - `detectAffectedTests` — BFS doğruluğu, transitive dependency, unknownFiles
  - `pathUtils` — cross-platform path dönüşümleri, spec pattern matching
  - Integration tests — mock git repo + gerçek TS dosyaları ile full pipeline

## High

- [x] **Config file desteği** — `masat-cypress.config.json` ve `package.json` içinde `"masat-cypress"` key'i; `src/config/loadConfig.ts` modülü; öncelik: CLI > config > defaults

## Medium

- [x] **NPM publish hazırlığı** — `package.json`'a `repository`, `author`, `engines`, `files` alanları ekle; `version`'u `src/cli/run.ts`'de hardcode yerine `package.json`'dan dinamik oku
- [x] **`--dry-run` flag** — Cypress başlatmadan etkilenen spec'leri listele, CI öncesi kontrol için
- [ ] **Monorepo desteği** — `--tsconfig-paths` ile birden fazla tsconfig, graphları merge et, `package.json` workspaces otomatik algıla

## Low

- [x] **Hata mesajı iyileştirmeleri** — base ref bulunamazsa `main`/`master`/`trunk` otomatik öner; graph hatasında stack trace'i koru; spec glob eşleşmezse uyar
- [x] **`--spec-pattern` flag** — `.cy.ts`/`.spec.ts` dışındaki pattern'leri de destekle (`.e2e.ts`, `.test.ts` vb.)
- [x] **Verbose çıktı genişletmesi** — her aşamanın süresi, graph istatistikleri (node/edge sayısı), dead-end dosya analizi

## Tamamlananlar

- [x] **Graph caching** — `.masat-cypress/cache/graph.json`'a serialize; mtime-based invalidation; `--no-cache` flag
- [x] **Dynamic import desteği** — ts-morph AST'da `CallExpression + ImportKeyword` pattern'i ile `import()` çağrıları graph'a ekleniyor
- [x] **Linting & formatting** — ESLint (`@typescript-eslint/recommended` + `prettier`) + Prettier; `lint` ve `format` scriptleri eklendi
- [x] **CI/CD pipeline** — `.github/workflows/ci.yml` + `publish.yml` hazır; şu an `workflow_dispatch` ile devre dışı, NPM'e yayınlarken açılacak

---

## Çalışma Planı

### Grup 1 — Hızlı Kazanımlar (~25 dk) · 2 commit

**Hedef:** Bağımsız, az riskli değişiklikler.

**Adımlar:**

1. **NPM publish hazırlığı** (`package.json`)
   - `repository`, `author`, `license`, `engines` alanlarını ekle
   - `"files": ["dist/", "bin/"]` ekle
   - `version`'u `src/cli/run.ts`'de sabit string yerine `package.json`'dan dinamik oku
   - `tsc --noEmit` → **commit**

2. **`--dry-run` flag + hata mesajı iyileştirmeleri** (`src/cli/run.ts`)
   - `--dry-run`: Cypress'i spawn etme, spec listesini stdout'a yaz ve çık (exit 0)
   - base ref bulunamazsa `main`/`master`/`trunk` öner
   - spec glob eşleşmezse warn log bas
   - `tsc --noEmit` → **commit**

---

### Grup 2 — Config File Desteği (~30 dk) · 1 commit

**Hedef:** `masat-cypress.config.json` veya `package.json#masat-cypress` key'inden config okuma. Öncelik: CLI args > config file > defaults.

**Adımlar:**

1. `src/config/loadConfig.ts` oluştur
   - `MasatConfig` interface'i tanımla (tüm CLI opsiyonlarının opsiyonel versiyonu)
   - `loadConfig(cwd: string): MasatConfig` fonksiyonu:
     - `masat-cypress.config.json` varsa oku + parse et
     - Yoksa `package.json` oku, `"masat-cypress"` key'ini çek
     - Yoksa `{}` döndür
   - Bilinmeyen key varsa `logger.warn` bas

2. `src/cli/run.ts` içinde merge et
   - `loadConfig()` çağır
   - Her opsiyon için: `cliArg ?? configValue ?? defaultValue`

3. `tsc --noEmit` → **commit**

---

### Grup 3 — Test Suite · Oturum A (~35 dk) · 1 commit

**Hedef:** Test altyapısını kur, en izole modülleri test et.

**Adımlar:**

1. Bağımlılıkları yükle
   ```
   npm install --save-dev jest ts-jest @types/jest
   ```

2. `jest.config.ts` oluştur (root'a)
   ```ts
   export default {
     preset: 'ts-jest',
     testEnvironment: 'node',
     testMatch: ['**/src/__tests__/**/*.test.ts'],
   }
   ```

3. `package.json`'a `"test": "jest"` script'i ekle

4. `src/__tests__/pathUtils.test.ts` yaz
   - `toAbsolute`, `toRelative`, path normalizasyon
   - Windows-style path (`\\`) girişlerinin doğru işlendiğini test et

5. `src/__tests__/detectAffectedTests.test.ts` yaz
   - Dosya → spec direkt bağımlılık (shallow)
   - Transitive dependency (A → B → spec)
   - `unknownFiles` doğru doldurulduğu
   - Boş graph → boş sonuç

6. `npm test` yeşil → `tsc --noEmit` → **commit**

---

### Grup 3 — Test Suite · Oturum B (~40 dk) · 1 commit

**Hedef:** Daha karmaşık modüller + integration test.

**Adımlar:**

1. `src/__tests__/buildDependencyGraph.test.ts`
   - Re-export zinciri (`export * from`)
   - Circular dependency (hata fırlatmamalı, graceful handle)
   - tsconfig bulunamadığında fallback
   - Dynamic import kenarlarının doğru eklenmesi

2. `src/__tests__/getChangedFiles.test.ts`
   - `child_process` mock'la
   - Boş diff → boş array
   - Renamed/deleted dosya (D/R status)
   - Geçersiz ref → `GitError` fırlatmalı

3. `src/__tests__/integration.test.ts`
   - `tmp` dizini oluştur, gerçek `.ts` dosyaları yaz
   - `buildDependencyGraph` + `detectAffectedTests` pipeline'ını end-to-end çalıştır

4. `npm test` yeşil → `tsc --noEmit` → **commit**

---

### Grup 4 — CI/CD Aktifleştirme · 1 commit

**Hedef:** Test suite tamamlandıktan sonra CI/CD trigger'larını aç.

**Adımlar:**

1. `.github/workflows/ci.yml` — `on: workflow_dispatch` → `on: push` + `pull_request`
2. `.github/workflows/publish.yml` — `on: workflow_dispatch` → `on: push: tags: v*`
3. **commit**
