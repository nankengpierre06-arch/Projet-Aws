#!/usr/bin/env python3
"""
Test Automatisé de la Contrainte Critique C1 (Livrable 3 du sujet)
"Un lien permet exactement le nombre de téléchargements autorisé à sa création :
 jamais un de plus, quel que soit le nombre de visiteurs qui cliquent au même instant."

Ce script simule une rafale concurrente massive de requêtes HTTP
compétitionnant pour 500 places et vérifie formellement :
1. Exactement 500 réponses HTTP 200 (Places attribuées).
2. Toutes les autres requêtes reçoivent HTTP 410 (Épuisé).
3. Zéro erreur serveur (0 code 500).
4. Validation que les jetons sont à usage unique (zéro rejeu possible).
"""

import sys
import time
import json
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
TOTAL_REQUESTS = int(sys.argv[2]) if len(sys.argv) > 2 else 2000
QUOTA_PLACES = 500

def http_post(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def send_download_request(link_id):
    url = f"{BASE_URL}/api/download/{link_id}"
    start = time.time()
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            latency = (time.time() - start) * 1000
            data = json.loads(resp.read().decode("utf-8"))
            return resp.status, data, latency
    except urllib.error.HTTPError as e:
        latency = (time.time() - start) * 1000
        try:
            body = json.loads(e.read().decode("utf-8"))
        except:
            body = {}
        return e.code, body, latency
    except Exception as e:
        latency = (time.time() - start) * 1000
        return 0, {"error": str(e)}, latency

def run_test():
    print("=" * 70)
    print("  TEST DE CHARGE C1 : ARBITRAGE DU PIC DE TÉLÉCHARGEMENT (500 EX.) ")
    print("=" * 70)
    print(f"Cible API             : {BASE_URL}")
    print(f"Nombre de requêtes    : {TOTAL_REQUESTS}")
    print(f"Quota autorisé (C1)   : {QUOTA_PLACES}")
    print("-" * 70)

    # 1. Création du document
    print("[1/4] Création du document de test...")
    doc = http_post(f"{BASE_URL}/api/documents", {
        "title": "Revue Test C1 Grand Pic",
        "ownerEmail": "redacteur-en-chef@etudiant.fr"
    })
    doc_id = doc["docId"]
    print(f"  -> Document créé : {doc_id}")

    # 2. Création du lien avec quota N=500
    print(f"[2/4] Création du lien public avec quota N={QUOTA_PLACES}...")
    link = http_post(f"{BASE_URL}/api/links", {
        "docId": doc_id,
        "maxPlaces": QUOTA_PLACES,
        "creatorEmail": "auteur@etudiant.fr"
    })
    link_id = link["linkId"]
    print(f"  -> Lien public créé : {link_id}")

    # 3. Lancement de la rafale concurrente
    print(f"[3/4] Lancement de la rafale de {TOTAL_REQUESTS} requêtes concurrentes...")
    t_start = time.time()

    status_counts = {}
    tokens = []
    latencies = []

    # Exécution parallèle avec pool de threads
    with ThreadPoolExecutor(max_workers=50) as executor:
        futures = [executor.submit(send_download_request, link_id) for _ in range(TOTAL_REQUESTS)]

        for f in as_completed(futures):
            code, body, lat = f.result()
            latencies.append(lat)
            status_counts[code] = status_counts.get(code, 0) + 1

            if code == 200 and "token" in body:
                tokens.append(body["token"])

    t_total = time.time() - t_start
    rps = TOTAL_REQUESTS / t_total

    latencies.sort()
    avg_lat = sum(latencies) / len(latencies)
    p50 = latencies[int(len(latencies) * 0.50)]
    p95 = latencies[int(len(latencies) * 0.95)]
    p99 = latencies[int(len(latencies) * 0.99)]

    print("-" * 70)
    print("RÉSULTATS DU TEST DE CHARGE :")
    print(f"  • Durée totale          : {t_total:.2f} s")
    print(f"  • Débit moyen           : {rps:.1f} requêtes/sec")
    print(f"  • Latence moyenne       : {avg_lat:.1f} ms (p50: {p50:.1f} ms, p95: {p95:.1f} ms, p99: {p99:.1f} ms)")
    print(f"  • Répartition HTTP :")
    for code, count in sorted(status_counts.items()):
        label = "Admis (Place attribuée)" if code == 200 else "Rejet 410 (Quota épuisé)" if code == 410 else "Autre"
        print(f"      Code {code} : {count:5d} ({label})")

    # 4. Vérification formelle de la Contrainte C1
    print("-" * 70)
    print("[4/4] VÉRIFICATION FORMELLE DES CONTRAINTES :")

    success_c1 = (status_counts.get(200, 0) == QUOTA_PLACES)
    exhausted_correct = (status_counts.get(410, 0) == (TOTAL_REQUESTS - QUOTA_PLACES))
    no_errors = (status_counts.get(500, 0) == 0 and status_counts.get(0, 0) == 0)

    print(f"  [{'PASS' if success_c1 else 'FAIL'}] Exactement {QUOTA_PLACES} places attribuées : {status_counts.get(200, 0)}")
    print(f"  [{'PASS' if exhausted_correct else 'FAIL'}] Exactement {TOTAL_REQUESTS - QUOTA_PLACES} rejets 410 : {status_counts.get(410, 0)}")
    print(f"  [{'PASS' if no_errors else 'FAIL'}] Zéro erreur 500 (Résilience totale) : {status_counts.get(500, 0)}")

    # 5. Vérification du jeton à usage unique
    if tokens:
        test_token = tokens[0]
        print(f"\n[Test Jeton Unique] Test de rejeu sur le jeton {test_token[:8]}...")
        # Consommation 1
        url_file = f"{BASE_URL}/api/download/file?token={test_token}"
        try:
            req1 = urllib.request.urlopen(url_file)
            code1 = req1.status
        except urllib.error.HTTPError as e:
            code1 = e.code

        # Rejeu 2 (doit être 403 !)
        try:
            req2 = urllib.request.urlopen(url_file)
            code2 = req2.status
        except urllib.error.HTTPError as e:
            code2 = e.code

        token_burned = (code2 == 403)
        print(f"  [{'PASS' if token_burned else 'FAIL'}] Jeton brûlé au premier accès (Tentative de rejeu -> Code {code2})")

    print("=" * 70)
    if success_c1 and exhausted_correct and no_errors:
        print(">>> SUCCÈS TOTAL : LA CONTRAINTE C1 EST FORMELLEMENT RESPECTÉE ! <<<")
        print("=" * 70)
        sys.exit(0)
    else:
        print(">>> ÉCHEC DE LA VÉRIFICATION C1 <<<")
        print("=" * 70)
        sys.exit(1)

if __name__ == "__main__":
    run_test()
