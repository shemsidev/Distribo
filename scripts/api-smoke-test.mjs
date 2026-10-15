// Test i shpejtë nga fillimi në fund kundër API-së lokale.
// Përdorimi:  INTEGRATION_KEY=<Integration:ApiKey> node scripts/api-smoke-test.mjs [http://localhost:5180]
// Krijon të dhëna testimi (porosi, një klient i ri) në databazën e zhvillimit.

const BASE = process.argv[2] ?? 'http://localhost:5180';
const DEV_KEY = process.env.INTEGRATION_KEY ?? '';
const DEMO = { identifier: process.env.DEMO_PHONE ?? '0691234567', password: process.env.DEMO_PASSWORD ?? 'Demo12345' };

let failures = 0;
function check(name, condition, detail = '') {
  console.log(`${condition ? 'OK  ' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!condition) failures++;
}

async function api(path, { method = 'GET', token, body, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, json, headers: res.headers };
}

const run = Date.now().toString(36);

// --- Autentikimi ---
const health = await api('/health');
check('health', health.status === 200);

const login = await api('/api/auth/login', { method: 'POST', body: DEMO });
check('hyrje me telefon (format lokal)', login.status === 200, login.json?.code);
const token = login.json?.accessToken;
const refresh = login.json?.refreshToken;

const loginIntl = await api('/api/auth/login', { method: 'POST', body: { ...DEMO, identifier: '+355 69 123 4567' } });
check('hyrje me telefon (+355)', loginIntl.status === 200);

const me = await api('/api/me', { token });
const loginEmail = await api('/api/auth/login', { method: 'POST', body: { identifier: me.json?.email?.toUpperCase(), password: DEMO.password } });
check('hyrje me email (pa dallim shkronjash)', loginEmail.status === 200);

const wrong = await api('/api/auth/login', { method: 'POST', body: { identifier: DEMO.identifier, password: 'Gabim1234' } });
check('fjalëkalim i gabuar → 401', wrong.status === 401 && wrong.json?.code === 'invalid_credentials');

// --- Katalogu publik (pa login) ---
const anonProducts = await api('/api/catalog/products?pageSize=5');
check('vizitori sheh produktet pa login', anonProducts.status === 200 && anonProducts.json?.items?.length > 0);
const anonHome = await api('/api/home');
check('vizitori sheh kryefaqen (pa përshëndetje/porosi)', anonHome.status === 200 && anonHome.json?.greeting === null &&
  anonHome.json?.recentOrders?.length === 0 && anonHome.json?.categories?.length > 0);
const roots = await api('/api/catalog/categories');
const firstRoot = roots.json?.[0];
check('kategoritë kryesore', roots.status === 200 && roots.json?.every((c) => c.parentId === null) && firstRoot?.subcategoryCount > 0);
const rootDetail = await api(`/api/catalog/categories/${firstRoot?.id}`);
check('nënkategoritë e kategorisë', rootDetail.json?.children?.length === firstRoot?.subcategoryCount &&
  rootDetail.json?.children?.every((c) => c.parentId === firstRoot.id));
const sub = rootDetail.json?.children?.[0];
const subDetail = await api(`/api/catalog/categories/${sub?.id}`);
check('nënkategoria tregon prindin', subDetail.json?.parent?.id === firstRoot?.id);
const rootProducts = await api(`/api/catalog/products?categoryId=${firstRoot?.id}&pageSize=100`);
check('kategoria kryesore përfshin produktet e nënkategorive', rootProducts.json?.totalCount === firstRoot?.productCount);
const anonPricing = await api('/api/cart/pricing', { method: 'POST', body: { items: [{ productId: anonProducts.json.items[0].id, quantity: anonProducts.json.items[0].minOrderQuantity }] } });
check('vizitori llogarit shportën', anonPricing.status === 200);
check('porosia kërkon login → 401', (await api('/api/orders', { method: 'POST', body: {}, headers: { 'Idempotency-Key': 'anon-key-0001' } })).status === 401);
check('porositë e mia kërkojnë login → 401', (await api('/api/orders')).status === 401);
const expired = await api('/api/catalog/products', { token: 'eyJhbGciOiJIUzI1NiJ9.e30.invalid' });
check('token i pavlefshëm në katalog → 401 token_expired (jo çmime vizitori)', expired.status === 401 && expired.json?.code === 'token_expired');

// --- Katalogu ---
const search = await api(`/api/catalog/products?search=${encodeURIComponent('ujë')}`, { token });
check('kërkim sipas emrit me shkronja shqipe', search.json?.totalCount > 0, `${search.json?.totalCount} rezultate`);

const water = await api(`/api/catalog/products?search=${encodeURIComponent('Ujë natyral 0.5L')}`, { token });
const waterCode = water.json?.items?.[0]?.code;
const byCode = await api(`/api/catalog/products?search=${waterCode?.toLowerCase()}`, { token });
check('kërkim sipas kodit', byCode.json?.items?.[0]?.code === waterCode);

const barcode = byCode.json?.items?.[0]?.barcode;
const byBarcode = await api(`/api/catalog/products?search=${barcode}`, { token });
check('kërkim sipas barkodit', byBarcode.json?.items?.[0]?.barcode === barcode);

const sorted = await api('/api/catalog/products?sort=price_asc&pageSize=50', { token });
const prices = sorted.json?.items?.map((p) => p.promoPrice ?? p.price) ?? [];
check('renditje sipas çmimit', prices.every((p, i) => i === 0 || prices[i - 1] <= p));

const page2 = await api('/api/catalog/products?page=2&pageSize=10', { token });
check('paginim', page2.json?.items?.length === 10 && page2.json?.hasMore === true);

const home = await api('/api/home', { token });
check('kryefaqja', home.status === 200 && home.json?.categories?.length > 0 && home.json?.offers?.length > 0);

// --- Shporta dhe porosia ---
const addresses = await api('/api/addresses', { token });
const addressId = addresses.json?.[0]?.id;
check('adresat e klientit', addresses.json?.length > 0);

const p1 = byCode.json.items[0];
const qty = p1.minOrderQuantity;
const badPricing = await api('/api/cart/pricing', { method: 'POST', token, body: { items: [{ productId: p1.id, quantity: qty + 1 }] } });
check('shporta: sasi jo shumëfish paketimi refuzohet', badPricing.json?.isValid === false &&
  badPricing.json?.lines?.[0]?.issues?.some((i) => i.code === 'not_pack_multiple'));

const pricing = await api('/api/cart/pricing', { method: 'POST', token, body: { items: [{ productId: p1.id, quantity: qty }] } });
check('shporta: llogaritja në server', pricing.json?.isValid === true, `total ${pricing.json?.total}`);

const orderBody = { addressId, items: [{ productId: p1.id, quantity: qty }], notes: `smoke ${run}`, expectedTotal: pricing.json?.total };
const noKey = await api('/api/orders', { method: 'POST', token, body: orderBody });
check('porosi pa Idempotency-Key refuzohet', noKey.status === 400 && noKey.json?.code === 'idempotency_key_required');

const key = `smoke-${run}-0001`;
const created = await api('/api/orders', { method: 'POST', token, body: orderBody, headers: { 'Idempotency-Key': key } });
check('porosia u krijua', created.status === 201, created.json?.code ?? created.json?.order?.number);
const orderId = created.json?.order?.id;

const replay = await api('/api/orders', { method: 'POST', token, body: orderBody, headers: { 'Idempotency-Key': key } });
check('ridërgimi me të njëjtin çelës nuk krijon dublikatë', replay.status === 200 && replay.json?.replayed === true &&
  replay.json?.order?.id === orderId);

const parallelKey = `smoke-${run}-0002`;
const parallel = await Promise.all([1, 2, 3].map(() =>
  api('/api/orders', { method: 'POST', token, body: orderBody, headers: { 'Idempotency-Key': parallelKey } })));
const parallelIds = new Set(parallel.map((r) => r.json?.order?.id).filter(Boolean));
check('3 kërkesa paralele me të njëjtin çelës → 1 porosi', parallelIds.size === 1, parallel.map((r) => r.status).join(','));

const reused = await api('/api/orders', { method: 'POST', token, body: { ...orderBody, notes: 'tjetër' }, headers: { 'Idempotency-Key': key } });
check('çelës i ripërdorur me të dhëna të tjera → 409', reused.status === 409 && reused.json?.code === 'idempotency_key_reused');

const changed = await api('/api/orders', { method: 'POST', token, body: { ...orderBody, expectedTotal: 1 }, headers: { 'Idempotency-Key': `smoke-${run}-0003` } });
check('total i ndryshuar → price_changed', changed.status === 409 && changed.json?.code === 'price_changed');

const list = await api('/api/orders', { token });
check('lista e porosive', list.json?.items?.some((o) => o.id === orderId));

// --- Izolimi ndërmjet klientëve ---
const phone2 = `06${String(Date.now()).slice(-8)}`;
const reg = await api('/api/auth/register', {
  method: 'POST',
  body: { fullName: 'Klient Testi', businessName: `Dyqan ${run}`, email: `test-${run}@distribo.test`, phone: phone2, password: 'Testim123', city: 'Durrës', street: 'Rruga 1' },
});
check('regjistrim me email + telefon', reg.status === 200 && !!reg.json?.session, reg.json?.code);
const token2 = reg.json?.session?.accessToken;

const dupPhone = await api('/api/auth/register', {
  method: 'POST',
  body: { fullName: 'Tjetër Dikush', businessName: 'Dyqan tjetër', email: `tjeter-${run}@distribo.test`, phone: `+355${phone2.slice(1)}`, password: 'Testim123' },
});
check('telefon i përsëritur (format tjetër) refuzohet', dupPhone.status === 409 && dupPhone.json?.code === 'phone_taken');

check('klienti B nuk lexon porosinë e A → 404', (await api(`/api/orders/${orderId}`, { token: token2 })).status === 404);
check('klienti B nuk anulon porosinë e A → 404', (await api(`/api/orders/${orderId}/cancel`, { method: 'POST', token: token2 })).status === 404);
const foreignAddress = await api('/api/orders', { method: 'POST', token: token2, body: { addressId, items: [{ productId: p1.id, quantity: qty }] }, headers: { 'Idempotency-Key': `smoke-${run}-b001` } });
check('klienti B nuk përdor adresën e A', foreignAddress.status === 400 && foreignAddress.json?.code === 'address_invalid');

const priceA = (await api(`/api/catalog/products/${p1.id}`, { token })).json?.price;
const priceB = (await api(`/api/catalog/products/${p1.id}`, { token: token2 })).json?.price;
check('çmime sipas klientit', priceA !== priceB, `A=${priceA}, B=${priceB}`);

// --- Statuset (simulim i programit të distribucionit) ---
if (DEV_KEY) {
  const setStatus = (status) => api(`/api/integration/orders/${orderId}/status`, { method: 'POST', body: { status }, headers: { 'X-Integration-Key': DEV_KEY } });
  check('kalim i palejuar Pending → Delivered', (await setStatus('Delivered')).status === 409);
  for (const s of ['Confirmed', 'Preparing', 'InTransit', 'Delivered']) {
    const r = await setStatus(s);
    check(`status → ${s}`, r.status === 200 && r.json?.status === s);
  }
  const cancel = await api(`/api/orders/${orderId}/cancel`, { method: 'POST', token });
  check('porosi e dorëzuar nuk anulohet', cancel.status === 409);
  const notes = await api('/api/notifications', { token });
  check('njoftimet e statusit u ruajtën', notes.json?.items?.length >= 5);
} else {
  console.log('SKIP  testet e statusit (mungon INTEGRATION_KEY)');
}
check('integrimi pa çelës → 404', (await api(`/api/integration/orders/${orderId}/status`, { method: 'POST', body: { status: 'Cancelled' } })).status === 404);

// Anulim nga klienti kur porosia është ende në pritje.
const pendingKey = `smoke-${run}-0004`;
const pending = await api('/api/orders', { method: 'POST', token, body: { addressId, items: [{ productId: p1.id, quantity: qty }] }, headers: { 'Idempotency-Key': pendingKey } });
const cancelled = await api(`/api/orders/${pending.json?.order?.id}/cancel`, { method: 'POST', token });
check('klienti anulon porosinë në pritje', cancelled.status === 200 && cancelled.json?.status === 'Cancelled');

// --- Sesioni ---
const rotated = await api('/api/auth/refresh', { method: 'POST', body: { refreshToken: refresh } });
check('refresh rrotullon token-in', rotated.status === 200 && rotated.json?.refreshToken !== refresh);
const reuse = await api('/api/auth/refresh', { method: 'POST', body: { refreshToken: refresh } });
check('ripërdorimi i refresh të vjetër refuzohet', reuse.status === 401);
const afterReuse = await api('/api/auth/refresh', { method: 'POST', body: { refreshToken: rotated.json?.refreshToken } });
check('pas ripërdorimit revokohet gjithë familja', afterReuse.status === 401);

const webLogin = await api('/api/auth/login', { method: 'POST', body: DEMO, headers: { 'X-Client-Type': 'web' } });
const cookie = webLogin.headers.get('set-cookie') ?? '';
check('web: refresh në cookie HttpOnly, jo në trup', webLogin.json?.refreshToken === '' && /httponly/i.test(cookie));

console.log(failures ? `\n${failures} test(e) dështuan.` : '\nTë gjitha testet kaluan.');
process.exit(failures ? 1 : 0);
