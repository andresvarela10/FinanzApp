# 💰 FinanzApp — Gestor de Finanzas Personales e Inversiones

Una aplicación web completa para gestionar tus finanzas personales e inversiones indexadas.
Diseñada para uso personal, inspirada en MyInvestor, Portfolio Performance y TradingView.

---

## ✨ Características principales

| Módulo | Funcionalidades |
|--------|----------------|
| 📊 **Dashboard** | Patrimonio neto, cartera, ahorro mensual, gastos por categoría |
| 💸 **Transacciones** | Ingresos y gastos con categorías personalizables y gráficos |
| 📈 **Inversiones** | Fondos indexados, NAV automático, ETF proxy intradía, rentabilidad |
| 🏦 **Patrimonio neto** | Activos, pasivos, evolución histórica mensual |
| 🎯 **Objetivos** | Metas financieras con progreso y fecha estimada de consecución |
| 🔢 **Simulador** | Interés compuesto con comparativa de escenarios e inflación |
| 📥 **Importación** | CSV y Excel desde MyInvestor con detección automática |

---

## 🛠️ Stack tecnológico

```
Backend:   Node.js · Express · TypeScript · Prisma ORM
Base datos: PostgreSQL 15
Frontend:  React 18 · TypeScript · Vite · TailwindCSS · Recharts
Auth:      JWT (JSON Web Tokens)
Datos:     Yahoo Finance (ETF intraday) · Morningstar (NAV fondos)
Import:    csv-parse · xlsx (CSV y Excel)
Scheduler: node-cron (actualización diaria automática de NAVs)
Deploy:    Docker Compose
```

---

## 🚀 Instalación rápida (Docker — recomendado)

### Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y en ejecución
- Git

### 1. Clonar el repositorio

```bash
git clone <tu-repo-url>
cd finance-app
```

### 2. Copiar variables de entorno

```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` y cambia al menos:
```env
JWT_SECRET=una-clave-secreta-muy-larga-y-aleatoria-minimo-32-caracteres
```

### 3. Arrancar todo con Docker Compose

```bash
docker-compose up --build
```

Esto arrancará automáticamente:
- PostgreSQL en el puerto `5432`
- Backend API en `http://localhost:4000`
- Frontend en `http://localhost:3000`
- Migraciones de base de datos
- Seed con usuario demo y fondos preconfigurados

### 4. Abrir la aplicación

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

**Cuenta demo lista para usar:**
```
Email:    demo@finanzas.app
Contraseña: demo1234
```

---

## 💻 Instalación local (sin Docker)

### Requisitos
- Node.js 20+
- PostgreSQL 15+
- npm o yarn

### 1. Clonar y entrar al proyecto

```bash
git clone <tu-repo-url>
cd finance-app
```

### 2. Configurar el backend

```bash
cd backend
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu configuración de PostgreSQL
```

Edita `backend/.env`:
```env
DATABASE_URL="postgresql://TU_USUARIO:TU_PASSWORD@localhost:5432/finance_app"
JWT_SECRET="cambia-esto-por-una-clave-secreta-larga"
PORT=4000
FRONTEND_URL=http://localhost:3000
```

### 3. Configurar la base de datos

```bash
# Crear la base de datos en PostgreSQL
createdb finance_app

# Ejecutar migraciones
npx prisma migrate dev --name init

# Generar el cliente Prisma
npx prisma generate

# Cargar datos iniciales (usuario demo + categorías + fondos)
npm run db:seed
```

### 4. Arrancar el backend

```bash
npm run dev
# API disponible en http://localhost:4000
```

### 5. Configurar el frontend

Abre una nueva terminal:

```bash
cd frontend
npm install
```

Crea `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:4000
```

```bash
npm run dev
# Frontend disponible en http://localhost:3000
```

---

## 📁 Estructura del proyecto

```
finance-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Modelos de base de datos
│   │   └── seed.ts                # Datos iniciales
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts        # Cliente Prisma
│   │   │   └── env.ts             # Variables de entorno
│   │   ├── controllers/           # Lógica de cada módulo
│   │   │   ├── auth.controller.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── transactions.controller.ts
│   │   │   ├── investments.controller.ts
│   │   │   ├── goals.controller.ts
│   │   │   ├── networth.controller.ts
│   │   │   └── import.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT middleware
│   │   │   └── error.ts           # Manejo de errores global
│   │   ├── routes/
│   │   │   └── index.ts           # Todas las rutas API
│   │   ├── services/
│   │   │   ├── market-data.service.ts   # Yahoo Finance + Morningstar
│   │   │   ├── import.service.ts        # Parseo CSV/Excel
│   │   │   ├── portfolio.service.ts     # Cálculo de holdings
│   │   │   └── scheduler.service.ts     # Cron jobs
│   │   ├── utils/
│   │   │   ├── jwt.ts             # Utilidades JWT
│   │   │   └── helpers.ts         # Helpers de fechas
│   │   ├── app.ts                 # Express app
│   │   └── server.ts              # Entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts          # Axios con interceptores JWT
│   │   │   └── index.ts           # Todos los módulos de API
│   │   ├── components/
│   │   │   ├── Layout/            # Sidebar + Layout
│   │   │   └── ui/                # Card, Button, Modal, etc.
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Transactions.tsx
│   │   │   ├── Investments.tsx
│   │   │   ├── NetWorth.tsx
│   │   │   ├── Goals.tsx
│   │   │   ├── Simulator.tsx
│   │   │   └── Import.tsx
│   │   ├── store/
│   │   │   └── authStore.ts       # Zustand auth state
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript types
│   │   ├── utils/
│   │   │   ├── formatters.ts      # Formateo de moneda/fechas
│   │   │   └── calculations.ts    # Interés compuesto, FIRE
│   │   ├── App.tsx                # Rutas y autenticación
│   │   └── main.tsx               # Entry point React
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## 🌐 API Reference

Base URL: `http://localhost:4000/api`

Todas las rutas (excepto auth) requieren header:
```
Authorization: Bearer <token>
```

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Crear cuenta |
| POST | `/auth/login` | Iniciar sesión |
| GET | `/auth/me` | Perfil del usuario |
| PUT | `/auth/me` | Actualizar perfil |

### Dashboard
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/dashboard` | Resumen completo con todos los datos y gráficos |

### Transacciones
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/transactions` | Listar (filtros: type, categoryId, startDate, endDate, page) |
| POST | `/transactions` | Crear transacción |
| PUT | `/transactions/:id` | Actualizar |
| DELETE | `/transactions/:id` | Eliminar |
| GET | `/transactions/stats/monthly` | Estadísticas de los últimos 12 meses |
| GET | `/categories` | Listar categorías |
| POST | `/categories` | Crear categoría |
| DELETE | `/categories/:id` | Eliminar categoría |

### Inversiones
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/funds` | Listar fondos con holdings y NAV |
| POST | `/funds` | Añadir fondo |
| PUT | `/funds/:id` | Actualizar fondo |
| DELETE | `/funds/:id` | Eliminar fondo |
| POST | `/funds/:id/update-nav` | Actualizar NAV manualmente |
| GET | `/funds/:id/intraday` | Precio intradía del ETF proxy |
| GET | `/investment-transactions` | Listar operaciones |
| POST | `/investment-transactions` | Registrar operación |
| DELETE | `/investment-transactions/:id` | Eliminar operación |
| GET | `/portfolio` | Resumen de cartera |

### Importación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/import/preview` | Vista previa (multipart/form-data, campo: `file`) |
| POST | `/import` | Importar (multipart/form-data, campos: `file`, `broker`) |

### Objetivos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/goals` | Listar con progreso calculado |
| POST | `/goals` | Crear objetivo |
| PUT | `/goals/:id` | Actualizar |
| DELETE | `/goals/:id` | Eliminar |

### Patrimonio neto
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/net-worth` | Resumen completo con historial |
| GET | `/assets` | Listar activos |
| POST | `/assets` | Crear activo |
| PUT | `/assets/:id` | Actualizar activo |
| DELETE | `/assets/:id` | Eliminar activo |
| GET | `/liabilities` | Listar pasivos |
| POST | `/liabilities` | Crear pasivo |
| PUT | `/liabilities/:id` | Actualizar pasivo |
| DELETE | `/liabilities/:id` | Eliminar pasivo |

---

## 📊 Fuentes de datos de mercado

La aplicación usa una estrategia multi-fuente con fallback automático:

### ETFs (precio intradía)
**Yahoo Finance** — gratuito, sin API key

Ejemplos de tickers europeos:
| Fondo | Ticker Yahoo |
|-------|-------------|
| iShares MSCI World | `IWDA.AS` (Euronext Amsterdam) |
| Vanguard All-World | `VWCE.DE` (XETRA) |
| iShares Core S&P 500 | `SXR8.DE` (XETRA) |
| Vanguard S&P 500 | `VUSD.L` (London) |
| Invesco NASDAQ-100 | `EQQQ.L` (London) |
| Vanguard Emerging Markets | `VFEM.AS` (Euronext) |

### Fondos indexados (NAV diario)
**Morningstar** — gratuito, sin API key, busca por ISIN automáticamente

### Configuración del ETF proxy
En cada fondo puedes configurar el **ETF proxy** (ticker de Yahoo Finance) para obtener una estimación del precio intradía aunque el NAV oficial solo se publique al cierre del mercado.

El campo `etfProxy` en el formulario de fondo acepta cualquier ticker válido de Yahoo Finance.

### Alpha Vantage (opcional)
Si quieres mayor fiabilidad, puedes obtener una API key gratuita en [alphavantage.co](https://www.alphavantage.co/support/#api-key) y configurarla en `.env`:
```env
ALPHA_VANTAGE_API_KEY=tu_api_key_aqui
```

---

## 📥 Importación desde MyInvestor

### Cómo exportar desde MyInvestor

1. Entra en **MyInvestor → Mi cartera → Fondos**
2. Accede a cada fondo individualmente
3. Haz clic en **"Exportar" o "Descargar movimientos"**
4. Elige formato **CSV** o **Excel**
5. Importa el archivo en FinanzApp → **Importar**

### Formato CSV detectado automáticamente

La app detecta estas columnas de MyInvestor:
```
Fecha | Operación | ISIN | Fondo | Participaciones | Valor liquidativo | Importe
```

Tipos de operación reconocidos:
- `Suscripción` → compra
- `Reembolso` → venta  
- `Dividendo` → dividendo
- `Traspaso` → transferencia

### Otros brokers

La importación genérica funciona con cualquier CSV/Excel que tenga columnas reconocibles para fecha, tipo, importe, participaciones y nombre del fondo.

---

## ⏰ Actualización automática de NAVs

El sistema actualiza automáticamente los valores liquidativos:

- **Cada día laborable a las 20:00** (hora de Madrid) — después del cierre de los mercados europeos
- **El día 1 de cada mes a las 01:00** — snapshot del patrimonio neto

Puedes también actualizar manualmente desde la página de **Inversiones** haciendo clic en el icono de actualización junto a cada fondo.

---

## 🔒 Seguridad

- Contraseñas hasheadas con **bcrypt** (12 rondas)
- Autenticación con **JWT** (expiran en 7 días por defecto)
- Rate limiting: 200 requests por IP cada 15 minutos
- Headers de seguridad con **Helmet**
- CORS restringido al dominio del frontend
- Validación de inputs con **Zod**

---

## 🚢 Despliegue en producción

### Variables de entorno para producción

```env
# backend/.env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@tu-db-host:5432/finance_app
JWT_SECRET=clave-muy-larga-y-aleatoria-generada-con-openssl-rand-hex-32
FRONTEND_URL=https://tu-dominio.com
PORT=4000
```

### Build de producción

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Sirve la carpeta dist/ con nginx o similar
```

### Docker en producción (VPS)

```bash
# En el servidor
docker-compose -f docker-compose.yml up -d --build

# Ver logs
docker-compose logs -f backend

# Actualizar
git pull
docker-compose up -d --build
```

### Servicios recomendados para despliegue

| Componente | Opción gratuita | Opción de pago |
|-----------|----------------|----------------|
| Base de datos | [Supabase](https://supabase.com) / [Railway](https://railway.app) | AWS RDS |
| Backend | [Railway](https://railway.app) / [Render](https://render.com) | VPS propio |
| Frontend | [Vercel](https://vercel.com) / [Netlify](https://netlify.com) | CDN propio |

---

## 🐛 Solución de problemas comunes

### El backend no arranca
```bash
# Ver logs detallados
docker-compose logs backend

# Verificar conexión a base de datos
docker-compose exec backend npx prisma db pull
```

### Error de migraciones
```bash
# Resetear la base de datos (¡borra todos los datos!)
docker-compose exec backend npx prisma migrate reset

# O aplicar migraciones pendientes
docker-compose exec backend npx prisma migrate deploy
```

### El NAV no se actualiza
- Verifica que el **ISIN** del fondo es correcto (12 caracteres)
- Configura el **ETF proxy** (ticker de Yahoo Finance) como alternativa
- Algunos fondos de acumulación solo publican NAV semanalmente
- Comprueba los logs: `docker-compose logs backend | grep NAV`

### Error al importar CSV
- Asegúrate de exportar desde MyInvestor con separador **punto y coma (;)**
- Si usas Excel, exporta a `.xlsx` (no `.xls` antiguo si es posible)
- Comprueba la vista previa antes de importar para verificar que los datos se leen correctamente

---

## 📜 Licencia

MIT — uso personal libre. No distribuir datos financieros de terceros.

---

## 🗺️ Roadmap futuro

- [ ] Soporte para acciones individuales (bolsa)
- [ ] Integración directa con API de MyInvestor (cuando disponible)
- [ ] App móvil (React Native)
- [ ] Exportación PDF de informes anuales
- [ ] Notificaciones por email (aportaciones programadas, hitos)
- [ ] Soporte multi-divisa con conversión automática
- [ ] Comparativa contra índices de referencia (benchmark)
- [ ] Integración con Indexa Capital y Finizens
- [ ] 2FA (autenticación de dos factores)
