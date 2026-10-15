# Publikimi

## Kujdes për Hostinger

- **Shared / Web / Cloud Hosting nuk mjafton.** Aty mund të ekzekutohen vetëm PHP/Node.js dhe ka vetëm MySQL.
  Ky lloj hostingu nuk ekzekuton ASP.NET Core dhe nuk ofron PostgreSQL.
- **Duhet një VPS** (p.sh. Hostinger KVM, Ubuntu 24.04). Në të instalohen .NET 9, PostgreSQL dhe nginx.
- Versioni web i aplikacionit (skedarë statikë) mund të vendoset në të njëjtin VPS ose në çdo hosting statik.

Backend-i mbështet të dy databazat. Në prodhim përdoret PostgreSQL me konfigurimin:
`Database__Provider=Postgres`.

## 1. VPS: PostgreSQL

```bash
sudo apt update && sudo apt install -y postgresql
sudo -u postgres psql -c "CREATE USER distribo WITH PASSWORD '<fjalëkalim i fortë>';"
sudo -u postgres psql -c "CREATE DATABASE distribo OWNER distribo;"
```

PostgreSQL dëgjon vetëm në `localhost`. Mos e hapni portin 5432 në internet.

## 2. VPS: API

```bash
# Në kompjuterin tuaj
cd server/Distribo.Api
dotnet publish -c Release -o ./publish
# Kopjo ./publish në VPS, p.sh. /opt/distribo/api
```

Ndërtoni shërbimin systemd `/etc/systemd/system/distribo-api.service`:

```ini
[Unit]
Description=Distribo API
After=network.target postgresql.service

[Service]
WorkingDirectory=/opt/distribo/api
ExecStart=/usr/bin/dotnet /opt/distribo/api/Distribo.Api.dll --urls http://127.0.0.1:5180
Restart=always
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=Database__Provider=Postgres
Environment=Database__MigrateOnStartup=true
Environment=ConnectionStrings__Default=Host=localhost;Database=distribo;Username=distribo;Password=<...>
Environment=Jwt__SigningKey=<64 karaktere të rastësishme>
Environment=Cors__AllowedOrigins__0=https://app.domaini-juaj.al
Environment=Registration__AutoApprove=false
Environment=Integration__ApiKey=<çelës i gjatë i rastësishëm>

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now distribo-api
```

- Sekretet vendosen vetëm këtu, si variabla mjedisi, dhe asnjëherë në repo.
- `Seed:Enabled` mbetet `false` në prodhim, ndaj katalogu i testimit nuk krijohet.
- `Integration__ApiKey` (çelës i gjatë i rastësishëm) aktivizon `/api/integration/*` (statuset e porosive, miratimi i klientëve) për programin e distribucionit/administratorin. Ruajeni vetëm në server.

## 3. VPS: nginx + HTTPS

```nginx
server {
    server_name api.domaini-juaj.al;
    location / {
        proxy_pass http://127.0.0.1:5180;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d api.domaini-juaj.al -d app.domaini-juaj.al
```

## 4. Versioni web

```bash
EXPO_PUBLIC_API_URL=https://api.domaini-juaj.al npx expo export --platform web
# Kopjo dist/ te /var/www/distribo-web
```

```nginx
server {
    server_name app.domaini-juaj.al;
    root /var/www/distribo-web;
    location / { try_files $uri /index.html; }
}
```

Web-i dhe API-ja duhet të jenë në të njëjtin domain bazë (`app.` dhe `api.`). Vetëm kështu cookie-ja e sesionit
(`SameSite=Strict`, HttpOnly) funksionon.

## 5. Android dhe iOS (EAS)

```bash
npm install -g eas-cli
eas login
eas init                       # krijon projektin EAS dhe shton projectId (i nevojshëm për push)
npx expo install expo-dev-client   # vetëm për build-in "development" (mos e mbani kur testoni me Expo Go)
# Ndrysho EXPO_PUBLIC_API_URL te eas.json në adresën reale
eas build --profile preview --platform android     # APK për testim
eas build --profile production --platform all      # për Play Store / App Store
```

Për njoftimet push në Android duhen kredencialet FCM në EAS (`eas credentials`). Në iOS duhet një llogari
Apple Developer. Push-et nuk punojnë në Expo Go në Android. Për t'i testuar, përdorni
`eas build --profile development`.

## 6. Lidhja me programin e distribucionit

Tani API ka databazën e vet (skema `app`). Për lidhjen me programin ekzistues duhen:

1. Tabelat ose view-t e artikujve, kategorive, çmimeve sipas klientit dhe stokut.
2. Mënyra se si regjistrohet një porosi në program (tabelë/dokument).
3. Kodi i klientit (`Customer.ExternalCode`) për të lidhur llogaritë e aplikacionit me klientët ekzistues.

Me këto të dhëna mund të ndërtohet sinkronizimi (import katalogu/çmimesh dhe eksport porosish), pa ndryshuar
strukturën e databazës ekzistuese.
