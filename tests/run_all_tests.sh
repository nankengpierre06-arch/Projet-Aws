#!/bin/bash
set -e

# ==============================================================================
# Lanceur global de la suite de tests automatisés (Livrable 3)
# ==============================================================================

PORT=8888
BASE_URL="http://127.0.0.1:${PORT}"

echo "=================================================================="
echo "    LANCEMENT DE LA SUITE DE TESTS DU JOURNAL COLLABORATIF        "
echo "=================================================================="

# 1. Démarrage du serveur en arrière-plan
echo "[1/3] Démarrage du serveur de test sur le port ${PORT}..."
PORT_API=${PORT} PORT_COLLAB=1888 node backend/bin/server.js > /tmp/test-server.log 2>&1 &
SERVER_PID=$!

cleanup() {
    echo ""
    echo "[Arrêt] Extinction du serveur de test (PID ${SERVER_PID})..."
    kill $SERVER_PID 2>/dev/null || true
}
trap cleanup EXIT

# 2. Attente de la disponibilité du serveur
echo "Attente de la réponse healthcheck..."
for i in {1..30}; do
    if curl -s "${BASE_URL}/health" > /dev/null; then
        echo "Serveur opérationnel !"
        break
    fi
    sleep 0.5
done

# 3. Exécution des tests de charge et de conformité
echo ""
echo "[2/3] Exécution du test de charge C1 (Pic de parution pour 500 places)..."
python3 tests/test_c1_burst.py "${BASE_URL}" 1000

echo ""
echo "[3/3] Exécution du test C4 (Crédit d'écriture et Anti-Abus)..."
python3 tests/test_c4_quota.py "${BASE_URL}"

echo ""
echo "=================================================================="
echo "    TOUS LES TESTS AUTOMATISÉS ONT ÉTÉ EXÉCUTÉS AVEC SUCCÈS !     "
echo "=================================================================="
