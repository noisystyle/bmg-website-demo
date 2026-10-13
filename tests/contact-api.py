"""Non-delivery HTTP checks. Run against a local server WITHOUT SMTP config."""
import json, sys, urllib.error, urllib.request
url = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8090/contact-api/index.php'
origin = 'http://127.0.0.1:8080'
def check(name, method, payload, expected, request_origin=origin, content='application/json'):
    data = None if payload is None else payload if isinstance(payload, bytes) else json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={'Origin': request_origin, 'Content-Type': content}, method=method)
    try:
        response = urllib.request.urlopen(req, timeout=5)
    except urllib.error.HTTPError as error:
        response = error
    body = response.read().decode()
    assert response.status == expected, (name, response.status, body)
    if expected != 403:
        assert response.headers.get('Access-Control-Allow-Origin') == request_origin
    if body:
        assert json.loads(body)['ok'] is False
    print(f'PASS {name}: {response.status}')
check('preflight website', 'OPTIONS', None, 204)
check('preflight landing', 'OPTIONS', None, 204, 'http://127.0.0.1:8081')
check('foreign origin', 'POST', {}, 403, 'https://example.org')
check('method', 'GET', None, 405)
check('content type', 'POST', b'test', 415, content='text/plain')
check('malformed JSON', 'POST', b'{', 400)
check('missing fields', 'POST', {}, 422)
valid = {'name': 'Test', 'email': 'test@example.com', 'message': 'Test', 'metadata': {'form': 'bmg_contact'}}
check('missing antispam token', 'POST', valid, 403)
check('SMTP not configured', 'POST', {**valid, 'turnstileToken': 'dummy'}, 503)
check('oversized antispam token', 'POST', {**valid, 'turnstileToken': 'x' * 2049}, 422)
check('header injection', 'POST', {**valid, 'email': 'test@example.com\r\nBcc: other@example.com'}, 422)
check('spam trap', 'POST', {**valid, 'website': 'spam'}, 422)
check('unrecognized form', 'POST', {**valid, 'metadata': {'form': 'unknown'}}, 422)
check('non-string value', 'POST', {**valid, 'name': []}, 422)
check('body limit', 'POST', b'x' * 20001, 413)
