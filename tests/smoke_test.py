#!/usr/bin/env python3
"""
Lightweight smoke tests for the local API endpoints.
Run after starting the Node server: `node pong-server.js`

Usage: python tests/smoke_test.py
"""
import json
import urllib.request
import urllib.error

BASE = 'http://localhost:3000'

def req_json(method, path, data=None):
    url = BASE + path
    body = None
    headers = {}
    if data is not None:
        body = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.getcode(), json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode('utf-8')
            return e.code, json.loads(body) if body else {}
        except Exception:
            return e.code, {}
    except Exception as e:
        print('Request error:', e)
        return None, None


def main():
    print('1) Ping')
    code, data = req_json('GET', '/api/ping')
    print(code, data)

    print('\n2) Save test user')
    user_key = 'user_testschool_testuser'
    user_obj = {'username':'testuser','password':'pw123','isAdmin':True,'school':'testschool'}
    code, data = req_json('POST', '/api/saveUser', {'userKey': user_key, 'userObj': user_obj})
    print(code, data)

    print('\n3) Get user (should NOT include password)')
    code, data = req_json('GET', '/api/getUser/' + urllib.request.quote(user_key))
    print(code, data)
    if code == 200 and 'password' in data:
        print('ERROR: password field returned in GET /api/getUser')

    print('\n4) checkPassword valid')
    code, data = req_json('POST', '/api/checkPassword', {'userKey': user_key, 'password': 'pw123'})
    print(code, data)

    print('\n5) checkPassword invalid')
    code, data = req_json('POST', '/api/checkPassword', {'userKey': user_key, 'password': 'wrong'})
    print(code, data)

    print('\n6) Cleanup: remove test user (if API supports it)')
    # There is a /api/deleteUser POST in server
    code, data = req_json('POST', '/api/deleteUser', {'userKey': user_key})
    print(code, data)

    print('\nDone')

if __name__ == '__main__':
    main()
