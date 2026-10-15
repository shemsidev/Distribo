# Plani dhe gjendja – Distribo

## Teknologjitë

- **Aplikacioni:** Expo SDK 57, React Native 0.86, React 19.2, TypeScript 6 (strict), Expo Router,
  TanStack Query, expo-secure-store, expo-image dhe expo-notifications.
- **Backend:** ASP.NET Core 9 Web API, EF Core 9. Databaza: PostgreSQL në prodhim, SQL Server ose PostgreSQL në zhvillim.
- **Autentikimi:** JWT 15 min dhe refresh token 30 ditë. Refresh token-i rrotullohet dhe zbulohet ripërdorimi i tij.
  Ruhet në SecureStore në celular dhe në cookie HttpOnly në web.

## Fazat

| Faza | Gjendja | Përmbajtja |
| --- | --- | --- |
| 1. Baza | ✅ | Struktura, tema, navigimi, konfigurimi, lokalizimi, komponentët, ESLint |
| 2. Ndërfaqja | ✅ | Kryefaqja si te muci.al (kategori rrethore, shirit njoftimesh), kategori → nënkategori → produkte, dritarja "Porosi", kërkimi, shporta, porositë, llogaria |
| 3. API | ✅ | Klient HTTP (timeout, anulim, refresh i vetëm, gabime të tipizuara), regjistrim email+telefon, hyrje me telefon/email, sesion i sigurt |
| 4. Porositë | ✅ | Çmime sipas klientit nga serveri, rregullat e paketimit/minimumit/stokut, `Idempotency-Key`, `price_changed`, historiku, anulimi, "Porosit përsëri" |
| 5. Njoftimet | ✅ (kod) | Push nga backend-i pas çdo ndryshimi statusi (Expo Push API), historik njoftimesh, preferencat, cache dhe gjendja offline |
| 6. Publikimi | ✅ (konfigurim) | `eas.json`, identifikuesit e aplikacionit, udhëzuesi i publikimit në VPS (docs/DEPLOYMENT.md) |

## Testimi

- `npm test`: 33 teste njësi (formatimi, validimi, rregullat e sasisë, shporta)
- `dotnet test`: 26 teste njësi (telefoni/email-i, fjalëkalimet, kalimet e statusit)
- `scripts/api-smoke-test.mjs`: 50 kontrolle kundër API-së reale. Mbulon katalogun publik, nënkategoritë,
  login-in me telefon/email, idempotencën (edhe me kërkesa paralele), izolimin ndërmjet klientëve,
  statuset, rrotullimin e token-it dhe cookie-n në web.
- E testuar në shfletues: vizitor → kategori → nënkategori → produkt → shportë → login → porosi.

## Çfarë mbetet

1. **Testim në pajisje reale Android/iOS.** Ndërfaqja është testuar në web, por jo ende në telefon.
2. **Push në pajisje.** Duhet `eas init` (projectId), FCM për Android, llogari Apple për iOS dhe një build
   `development`/`preview`. Në Expo Go Android push-et nuk punojnë; njoftimet brenda aplikacionit punojnë kudo.
3. **Lidhja me programin e distribucionit.** Duhen tabelat e artikujve/çmimeve/stokut dhe mënyra e regjistrimit
   të porosive (shih docs/DEPLOYMENT.md, pika 6). Deri atëherë API ka databazën e vet dhe katalog testimi.
4. **Fotot e produkteve.** Katalogu i testimit përdor foto provizore me licencë të lirë (`server/Distribo.Api/SeedImages`, autorët te `ATTRIBUTIONS.md`). Fotot reale vijnë nga programi ose nga
   një ngarkim administrativ.
5. **Panel administrimi** (opsional). Statuset dhe miratimi i klientëve tani bëhen përmes `/api/integration/*`.
