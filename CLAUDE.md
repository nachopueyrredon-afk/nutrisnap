# NutriSnap — Instrucciones para Claude Code

## Qué es este proyecto

Plataforma de acompañamiento nutricional con dos roles:
- **Paciente** — app móvil (React Native + Expo) para registrar comidas, peso y recibir coaching
- **Profesional** — panel web (React + Vite) para monitorear pacientes y ajustar objetivos

## Estructura del monorepo

```
apps/mobile/     → React Native + Expo Router + TypeScript
apps/web/        → React + Vite (SPA, no SSR) — panel profesional
packages/api/    → Node.js + Fastify + Zod — backend REST
packages/shared/ → Tipos TypeScript compartidos + utils TDEE/unidades
```

## Comandos frecuentes

```bash
pnpm install                          # instalar dependencias
pnpm dev                              # correr todo en paralelo
pnpm --filter @nutrisnap/api dev      # solo backend
pnpm --filter @nutrisnap/mobile dev   # solo app mobile
pnpm --filter @nutrisnap/web dev      # solo panel web
pnpm build                            # build de todos los packages
pnpm type-check                       # verificar tipos en todos los packages
```

## Stack técnico

| Layer | Tecnología | Notas |
|---|---|---|
| App móvil | React Native + Expo | TypeScript strict, Expo Router para navegación |
| Panel web | React + Vite | SPA pura, sin Next.js, sin SSR |
| Backend | Fastify + Zod | TypeScript, módulo ESM, validación con Zod |
| DB | PostgreSQL vía Supabase | RLS activo en todas las tablas |
| Auth | Supabase Auth | JWT validado en cada request del backend |
| Hosting | Railway (API) + Vercel (web) | |

## Supabase

- **Project ID:** `vrhcvyppkepjoylkqhsp`
- **URL:** `https://vrhcvyppkepjoylkqhsp.supabase.co`
- **Región:** us-east-1
- El backend usa `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS — solo para operaciones admin)
- El cliente usa la anon/publishable key

## Reglas de negocio críticas — no modificar sin consultar

1. **`food_items` es read-only para usuarios.** Solo se pobla desde USDA y Open Food Facts. Nunca permitir que un usuario cree o edite alimentos.
2. **Barcode scanner siempre gratis.** No hay gate de freemium en `/foods/barcode`.
3. **AI foto tiene cuota:** free = 3/día, premium = ilimitado. Verificar en `ai_scan_logs`.
4. **Consentimiento en 2 pasos para vincular paciente ↔ profesional.** Primero `POST /links/connect` (pending), luego `POST /links/confirm/:id` (active). No fusionar en un solo paso.
5. **Ajuste de TDEE nunca automático.** El sistema sugiere, el usuario acepta (`PATCH /tdee/accept`).
6. **Sin lenguaje de castigo** en `coaching-messages.json`. Los mensajes están pendientes de validación por nutricionista antes del launch.
7. **El profesional solo accede a datos de pacientes con `patient_link.status = 'active'`.** Verificar siempre antes de devolver datos.
8. **Mensajería unidireccional en el MVP:** profesional → paciente. El paciente no responde dentro de la app.

## Fases de implementación

- **Fase 0** ✅ Setup: monorepo + schema Supabase + skeleton de todos los endpoints
- **Fase 1** Auth + onboarding + food search + diary UI + TDEE + weight log
- **Fase 2** AI Photo Scan (LogMeal) + Barcode Scanner (Open Food Facts)
- **Fase 3** Coaching + notificaciones push + modo mantenimiento
- **Fase 4** Panel profesional completo
- **Fase 5** RevenueCat + freemium gates + QA + launch

No implementar features de una fase sin completar la anterior.

## Convenciones de código

- **TypeScript strict** en todos los packages — sin `any` explícito
- **Zod** para validar todos los bodies y query params en el backend
- **No comentarios** salvo que el WHY sea no obvio
- Imports de `@nutrisnap/shared` para tipos compartidos (no duplicar tipos)
- En el backend, cada ruta en su propio archivo en `packages/api/src/routes/`
- RLS: el backend usa `service_role_key` (bypassa RLS), el cliente usa `anon_key`

## Variables de entorno

Los `.env` ya están creados y completos (en `.gitignore`). Los `.env.example` documentan la estructura. Las vars que faltan completar:
- `LOGMEAL_API_KEY` — necesaria para Fase 2
- `USDA_API_KEY` — necesaria para el seeder de alimentos
- `EXPO_PUBLIC_REVENUECAT_*` y `REVENUECAT_WEBHOOK_SECRET` — necesarias para Fase 5

## Cálculos implementados en `packages/shared`

- `calculateTDEE(profile)` — fórmula Mifflin-St Jeor + factor actividad + ajuste por objetivo
- `calculateMacros(kcal)` — 30% proteína / 40% carbos / 30% grasas
- `convertToGrams(quantity, unit, food)` — motor de unidades (g, kg, oz, lb, cup, tbsp, tsp, ml, l, unit, portion)
- `computeMacros(quantity_g, food)` — macros desnormalizados para diary_entries
