import json, urllib.request, urllib.error

API = 'http://localhost:3111/agentmemory/remember'

def post_memory(mem_type, title, content, concepts=None):
    if concepts is None:
        concepts = []
    elif isinstance(concepts, str):
        concepts = [c.strip() for c in concepts.split(' ') if c.strip()]
    data = json.dumps({'type': mem_type, 'title': title, 'content': content, 'concepts': concepts}).encode('utf-8')
    req = urllib.request.Request(API, data=data, headers={'Content-Type': 'application/json'}, method='POST')
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        result = json.loads(resp.read())
        return result.get('success', False)
    except Exception as e:
        print(f'  FAIL: {e}')
        return False

def load_graph(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_top_nodes(graph, top_n=8):
    degree = {}
    links = graph.get('links', graph.get('edges', []))
    for link in links:
        s = link.get('source', '')
        t = link.get('target', '')
        if isinstance(s, dict): s = s.get('id', str(s))
        if isinstance(t, dict): t = t.get('id', str(t))
        degree[s] = degree.get(s, 0) + 1
        degree[t] = degree.get(t, 0) + 1
    nodes_by_id = {}
    for n in graph.get('nodes', []):
        nodes_by_id[n.get('id', '')] = n
    top = sorted(degree.items(), key=lambda x: -x[1])[:top_n]
    result = []
    for nid, deg in top:
        node = nodes_by_id.get(nid, {})
        result.append((nid, node.get('label', nid), deg))
    return result

be = load_graph('/mnt/c/Firerfox Portable/Freeflow brain/backend_graphify_out/graph.json')
fe = load_graph('/mnt/c/Firerfox Portable/Freeflow brain/frontend_graphify_out/graph.json')

be_nodes = len(be.get('nodes', []))
be_edges = len(be.get('links', be.get('edges', [])))
fe_nodes = len(fe.get('nodes', []))
fe_edges = len(fe.get('links', fe.get('edges', [])))

print(f'Backend: {be_nodes} nodes, {be_edges} edges')
print(f'Frontend: {fe_nodes} nodes, {fe_edges} edges')

be_top = get_top_nodes(be, 6)
fe_top = get_top_nodes(fe, 6)

for nid, label, deg in be_top:
    print(f'BE top: {label} ({deg})')
for nid, label, deg in fe_top:
    print(f'FE top: {label} ({deg})')

print('\n=== POSTING TO AGENTMEMORY ===')

# 1. Project Identity
ok = post_memory(
    'architecture',
    'FreeFlow - Voice-to-Order System (Project Identity)',
    'FreeFlow to system glosowego zamawiania jedzenia: Amber (asystentka glosowa) x Gemini Live x Supabase. Backend: Node.js + Express + Supabase (PostgreSQL, eu-west-3). Frontend: React + TypeScript + Vite + Tailwind + Zustand. Deploy na Vercel (serverless). Aktywny endpoint API: /api/brain/v2.',
    'FreeFlow voice-to-order Amber GeminiLive Supabase Node.js Express React TypeScript Vercel'
)
print(f'  Identity: {"OK" if ok else "FAIL"}')

# 2. Backend Graph
ok = post_memory(
    'architecture',
    'FreeFlow Backend Knowledge Graph (800 nodes, 1219 edges, 128 communities)',
    'Backend codebase graph. 120 source files. Top components: OrderHandler (46 conn) - rozwiazywanie zamowien. FindHandler (28 conn) - discovery restauracji. QueryUnderstanding (23 conn) - NLU. compoundOrderParser (20 conn) - parsowanie zamowien zlozonych. sessionAdapter (20 conn) - adapter sesji. Pipeline: brainRouter -> SmartIntentLayer -> GPTReasoner -> TTS (Chirp HD pl-PL).',
    'FreeFlow backend graph OrderHandler FindHandler brainRouter SmartIntentLayer NLU'
)
print(f'  Backend graph: {"OK" if ok else "FAIL"}')

# 3. Frontend Graph
ok = post_memory(
    'architecture',
    'FreeFlow Frontend Knowledge Graph (785 nodes, 1013 edges, 86 communities)',
    'Frontend codebase graph. 248 source files. Top components: config.ts (36 conn), useGeminiLiveSession.ts (30 conn), App.tsx (28 conn), ClientPanel.tsx (28 conn), CustomerPanel.jsx (27 conn), Home.tsx (25 conn). Live UI session model: idle -> listening -> processing -> results_ready.',
    'FreeFlow frontend graph GeminiLiveSession CustomerPanel App ClientPanel Home React'
)
print(f'  Frontend graph: {"OK" if ok else "FAIL"}')

# 4. Live Pipeline
ok = post_memory(
    'architecture',
    'FreeFlow Live Pipeline - Gemini Live -> ToolRouter -> IVL -> Handler -> Response',
    'Live flow: Gemini Live (WebSocket) odbiera mowe -> ToolRouter mapuje tool->intent + guardy ICM/cart/order-mode -> IntentVerificationLayer (IVL v2): FSM escalation guard, args-session coherence, rapid-fire detection (<1500ms duplikat = BLOCK), confidence threshold 0.4 -> HandlerDispatcher -> ResponseBuilder -> TTS. Vercel serverless NIE wspiera persistent WebSocket -> HTTP fallback relayViaHttp().',
    'FreeFlow Live pipeline ToolRouter IVL IntentVerificationLayer GeminiLive WebSocket HTTP-fallback'
)
print(f'  Live pipeline: {"OK" if ok else "FAIL"}')

# 5. Key Contracts
ok = post_memory(
    'fact',
    'FreeFlow - Kluczowe Kontrakty Architektoniczne (6 zasad)',
    '1) /api/brain/v2 - aktywny endpoint; /api/brain -> 410 Gone. 2) LLM tylko w phrase/refiner/tts - core zamowien deterministyczny. 3) Bez redesignu discovery bez jawnej decyzji. 4) Backward compatibility starych rekordow DB wymagana. 5) Kod jest jedynym Source of Truth - markdown pomocniczy. 6) Testy przed commitem zawsze.',
    'FreeFlow kontrakty architektura deterministyczny discovery backward-compatibility source-of-truth testy'
)
print(f'  Contracts: {"OK" if ok else "FAIL"}')

# 6-10. Backend God Nodes (top 5)
for nid, label, deg in be_top[:5]:
    ok = post_memory(
        'fact',
        f'[FreeFlow BE] {label} - kluczowy komponent ({deg} polaczen)',
        f'Komponent backendu FreeFlow \"{label}\" ma {deg} polaczen w grafie wiedzy - jeden z najbardziej powiazanych wezlow architektury.',
        f'FreeFlow backend {label} god-node'
    )
    print(f'  BE {label}: {"OK" if ok else "FAIL"}')

# 11-15. Frontend God Nodes (top 5)
for nid, label, deg in fe_top[:5]:
    ok = post_memory(
        'fact',
        f'[FreeFlow FE] {label} - kluczowy komponent ({deg} polaczen)',
        f'Komponent frontendu FreeFlow \"{label}\" ma {deg} polaczen w grafie wiedzy - jeden z najbardziej powiazanych wezlow architektury.',
        f'FreeFlow frontend {label} god-node'
    )
    print(f'  FE {label}: {"OK" if ok else "FAIL"}')

# 16. Test Commands
ok = post_memory(
    'fact',
    'FreeFlow - Komendy Testowe (vitest)',
    'Testy: npm run test:cascade, npx vitest run api/brain/tests/liveToolRouter.test.js, npx vitest run api/brain/tests/conversationGuards.test.js, npx vitest run api/brain/tests/findHandler.itemLed.test.js. Bramka przed commitem: node --check + vitest dla dotknietych modulow + regresja.',
    'FreeFlow testy vitest liveToolRouter conversationGuards findHandler regression cascade'
)
print(f'  Test commands: {"OK" if ok else "FAIL"}')

# 17. Amber System Prompt
ok = post_memory(
    'fact',
    'FreeFlow - System prompt Amber (SYSTEM_INSTRUCTION v2)',
    'ZASADA NADRZEDNA Amber: minimalna ilosc krotkich zdan, zero small-talk, natychmiast po tool callu STOP. TRYBY: DISCOVERY/MENU/ORDER z osobnymi zasadami. HARD BLOCK fraz: "nie mamy", "niestety", "przepraszam". System prompt zyje w useGeminiLiveSession.ts + localStorage("amber_live_prompt") dla edycji runtime przez panel admin AmberControlDeck.',
    'FreeFlow Amber system-prompt SYSTEM_INSTRUCTION DISCOVERY MENU ORDER hard-block localStorage'
)
print(f'  Amber prompt: {"OK" if ok else "FAIL"}')

# 18. Special Instructions Pipeline
ok = post_memory(
    'fact',
    'FreeFlow - Special Instructions Pipeline (special_instructions)',
    'Parametr JSONB {removed, extra, note} w add_item_to_cart i add_items_to_cart. Walidacja przez safety_data.removable_ingredients - Amber odmawia usuniecia bazowych skladnikow dania. Przepychany przez caly pipeline: ToolSchemas -> ToolRouter -> orderHandler -> sessionCart -> OrderPersistence -> DB. Frontend mirror: liveToolDeclarations, normalizeData, CartContext, compactToolResponse.',
    'FreeFlow special_instructions JSONB add_item_to_cart safety_data removable_ingredients pipeline'
)
print(f'  Special instructions: {"OK" if ok else "FAIL"}')

# 19. Explicit Restaurant Lock
ok = post_memory(
    'fact',
    'FreeFlow - Explicit Restaurant Lock (P0 fix 2026-04-15)',
    'Fix problemu: entities.restaurant (name string) nie byl rozwiazywany do ID przed OrderHandler. DisambiguationService dostawal restaurant_id=null -> global item search -> dodawal pozycje z innej restauracji. Rozwiazanie: resolveRestaurantByName() w orderHandler.js + hardLock w DisambiguationService. Gdy hardLock=true + restaurantId set + scoped search empty -> ITEM_NOT_FOUND (brak global fallback).',
    'FreeFlow P0 fix explicit-restaurant-lock orderHandler DisambiguationService hardLock'
)
print(f'  Restaurant lock: {"OK" if ok else "FAIL"}')

# 20. IVL v2
ok = post_memory(
    'fact',
    'FreeFlow - IntentVerificationLayer v2 (State Machine Verifier)',
    'IVL v2 weryfikuje tool calle przed ICM: 5 regul, zero transcript dependency. FSM escalation guard: neutral/restaurant_selected -> confirm_order = HARD BLOCK. Args-session coherence: restaurant_id musi byc na liscie, pendingOrder dla confirm. Rapid-fire: duplikat tool+args <1500ms = BLOCK. Confidence threshold: 0.4 (ponizej = clarify response). 52/52 testow PASS.',
    'FreeFlow IVL IntentVerificationLayer state-machine FSM escalation-guard rapid-fire confidence-threshold'
)
print(f'  IVL v2: {"OK" if ok else "FAIL"}')

print('\n=== DONE ===')
