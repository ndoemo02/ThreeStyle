import os, urllib.request, json
url = os.environ['SUPABASE_URL']
tok = os.environ.get('SUPABASE_ACCESS_TOKEN','')
adm = os.environ.get('SUPABASE_ADMIN_TOKEN','')
print('url=', url)
print('tok_len=', len(tok), 'adm_len=', len(adm))
for label, t in [('ACCESS', tok), ('ADMIN', adm)]:
    req = urllib.request.Request(f'{url}/rest/v1/live_perf_logs?select=session_id&limit=1', headers={'apikey': t, 'Authorization': f'Bearer {t}'})
    try:
        r = urllib.request.urlopen(req, timeout=10)
        print(label, 'OK', r.status, r.read()[:80])
    except Exception as e:
        print(label, 'FAIL', e)
