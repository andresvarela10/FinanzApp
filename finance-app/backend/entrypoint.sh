#!/bin/sh
set -e

echo "⏳ Esperando a que PostgreSQL esté listo..."

# Esperar hasta que postgres acepte conexiones (máximo 60 segundos)
RETRIES=30
until npx prisma db execute --stdin <<EOF 2>/dev/null
SELECT 1;
EOF
do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo "❌ PostgreSQL no respondió a tiempo. Abortando."
    exit 1
  fi
  echo "   PostgreSQL no disponible aún, reintentando en 2s... ($RETRIES intentos restantes)"
  sleep 2
done

echo "✅ PostgreSQL listo"

echo ""
echo "🗄️  Sincronizando esquema de base de datos..."
npx prisma db push --accept-data-loss
echo "✅ Esquema sincronizado"

echo ""
echo "🌱 Cargando datos iniciales..."
npx ts-node prisma/seed.ts || echo "⚠️  Seed ya ejecutado o fallido (continuando de todas formas)"

echo ""
echo "🚀 Arrancando servidor..."
exec npm run dev
