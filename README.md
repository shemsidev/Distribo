# Distribo

Aplikacion për porositjen e produkteve nga një distributor: Android, iOS dhe web (Expo / React Native),
me backend ASP.NET Core Web API dhe databazë PostgreSQL ose SQL Server.

- **Katalogu është i hapur për këdo**: kategori → nënkategori → produkte, kërkim sipas emrit, kodit ose barkodit.
- **Identifikimi kërkohet vetëm kur dërgohet porosia** (dhe për historikun/llogarinë). Shporta e vizitorit
  kalon automatikisht te llogaria pas hyrjes.
- **Regjistrimi** bëhet me email + numër telefoni; **hyrja** me numër telefoni (parazgjedhje) ose email + fjalëkalim.
- Çmimet sipas klientit, oferta, sasi minimale/paketim, stok, transport falas mbi një prag.
- Porosi me mbrojtje nga dublikatat (`Idempotency-Key`), historik, statuse, anulim, "Porosit përsëri".
- Njoftime brenda aplikacionit dhe push (Expo Notifications), shqip/anglisht.

## Struktura

```
src/app/            Ekranet (Expo Router)
src/components/     Komponentë UI të ripërdorshëm
src/features/       Logjika sipas modulit (auth, cart, catalog, notifications)
src/services/       Klienti HTTP, ruajtja e token-ave, React Query, push
src/localization/   sq.ts, en.ts
server/Distribo.Api ASP.NET Core Web API (.NET 9, EF Core)
server/Distribo.Api.Tests  Teste njësi (xUnit)
scripts/api-smoke-test.mjs Test nga fillimi në fund kundër API-së
docs/               Plani, API dhe publikimi
```

## Nisja lokale

Kërkesa: Node.js 20+, .NET SDK 9, SQL Server (lokal) **ose** PostgreSQL.

### 1. API

```bash
cd server/Distribo.Api
dotnet tool restore
# Sekretet lokale (një herë), jashtë repo-s:
dotnet user-secrets set "Jwt:SigningKey" "<të paktën 32 karaktere të rastësishme>"
dotnet user-secrets set "Integration:ApiKey" "<çelës për endpoint-et e integrimit>"
dotnet run --launch-profile http        # http://0.0.0.0:5180
```

Në zhvillim API krijon databazën, aplikon migrimet dhe mbush një katalog testimi.
Lidhja me databazën është te `appsettings.Development.json` (`Database:Provider` + `ConnectionStrings:Default`).
Për PostgreSQL:

```json
"Database": { "Provider": "Postgres" },
"ConnectionStrings": { "Default": "Host=localhost;Database=distribo;Username=distribo;Password=..." }
```

Llogaria demo e testimit është te `Seed:DemoUser` në `appsettings.Development.json`.

### 2. Aplikacioni

```bash
npm install
npx expo start
```

- **Web**: shtyp `w` ose hap http://localhost:8081
- **Telefon**: skano kodin QR me Expo Go (i njëjti Wi-Fi). Aplikacioni gjen vetë API-në në kompjuterin
  që shërben Metro (porti 5180). Nëse telefoni nuk lidhet, lejo portin 5180 në Windows Firewall.
- Për një adresë tjetër API-je: `EXPO_PUBLIC_API_URL` te `.env.local` (shih `.env.example`).

### Statuset e porosive dhe miratimi i klientëve

Statuset i ndryshon programi i distribucionit (ose një administrator) me endpoint-et e integrimit:

```bash
curl -X POST http://localhost:5180/api/integration/orders/<orderId>/status \
  -H "X-Integration-Key: <Integration:ApiKey>" -H "Content-Type: application/json" \
  -d '{"status":"Confirmed"}'      # Confirmed → Preparing → InTransit → Delivered (ose Cancelled)

# Miratimi i një klienti të ri (kur Registration:AutoApprove = false), me kodin e tij në program:
curl -X POST "http://localhost:5180/api/integration/customers/<customerId>/approve?externalCode=K00123" \
  -H "X-Integration-Key: <Integration:ApiKey>"
```

Çdo ndryshim statusi ruhet në historik dhe i dërgon klientit njoftim.

## Kontrollet

```bash
npm run typecheck && npm run lint && npm test          # aplikacioni
cd server && dotnet test                                # backend
INTEGRATION_KEY=<Integration:ApiKey> node scripts/api-smoke-test.mjs   # API nga fillimi në fund (API duhet të jetë aktive)
```

## Publikimi

Shih [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) (VPS + PostgreSQL + nginx, web, build-et Android/iOS me EAS).
