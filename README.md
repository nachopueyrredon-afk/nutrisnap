# NutriSnap

Plataforma de acompañamiento nutricional con app móvil para pacientes y panel web para profesionales.

## Stack

| Capa | Tecnología |
|---|---|
| App móvil | React Native + Expo (TypeScript) |
| Panel web | React + Vite (TypeScript) |
| Backend | Node.js + Fastify (TypeScript) |
| Base de datos | PostgreSQL vía Supabase |
| Auth | Supabase Auth + JWT |
| Deploy API | Railway |
| Deploy Web | Vercel |

## Estructura

```
nutrisnap/
├── apps/
│   ├── mobile/          # React Native + Expo
│   └── web/             # React + Vite (panel profesional)
├── packages/
│   ├── api/             # Fastify backend
│   └── shared/          # Tipos TypeScript compartidos + utils
```

## Setup local

### Requisitos

- Node.js >= 20
- pnpm >= 9
- Expo CLI (`npm install -g expo-cli`)

### Instalación

```bash
pnpm install
```

### Variables de entorno

Copiá los `.env.example` en cada package y completá los valores:

```bash
cp packages/api/.env.example packages/api/.env
cp apps/mobile/.env.example apps/mobile/.env
cp apps/web/.env.example apps/web/.env
```

El `SUPABASE_SERVICE_ROLE_KEY` del backend lo encontrás en:
> Supabase Dashboard → Project Settings → API → service_role

### Supabase (ya configurado)

- **Proyecto:** nutrisnap
- **Project ID:** `vrhcvyppkepjoylkqhsp`
- **URL:** `https://vrhcvyppkepjoylkqhsp.supabase.co`
- **Región:** us-east-1

### Correr en desarrollo

```bash
# Todo en paralelo
pnpm dev

# Solo el backend
pnpm --filter @nutrisnap/api dev

# Solo la app mobile
pnpm --filter @nutrisnap/mobile dev

# Solo el panel web
pnpm --filter @nutrisnap/web dev
```

### Build

```bash
pnpm build
```

## Fases de implementación

- **Fase 0** (actual): Setup — monorepo, schema DB, estructura base ✅
- **Fase 1** (semanas 2-4): Core — auth, food DB, diary, TDEE, weight
- **Fase 2** (semanas 5-7): AI Photo Scan + Barcode Scanner
- **Fase 3** (semanas 8-10): Coaching + notificaciones push
- **Fase 4** (semanas 11-14): Panel profesional completo
- **Fase 5** (semanas 15-17): Freemium, RevenueCat, QA, launch

## Decisiones clave

- **food_items es read-only** para usuarios: solo USDA + Open Food Facts
- **Barcode scanner siempre gratis** — solo AI foto tiene cuota en free tier
- **Consentimiento explícito** para vincular paciente ↔ profesional (2 pasos)
- **TDEE nunca se ajusta automáticamente** — siempre requiere aceptación del usuario
- **Sin lenguaje de castigo** en mensajes de coaching (validar con nutricionista)
- **RLS habilitado** en todas las tablas con datos de usuario
