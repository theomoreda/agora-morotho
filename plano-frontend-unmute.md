# Plano de Front-end — Plataforma de Treino de Vendedores (Unmute / Agora)

> Base: documento `projeto-hackathon-agora-unmute.md`.
> Escopo desta task: **front-end** (telas + estados mockados). Back-end e
> avaliação por LLM ficam com outra pessoa; o front só consome o resultado.
> Stack mantida: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind.

## Premissas validadas

- Dois perfis no MVP: **Gestor** e **Vendedor**, com seleção mockada (sem login).
- Reaproveitar o encanamento de voz da Agora já existente em `app/`.
- Apagar todo o código do projeto antigo ("Prosa") e as demos (`vozativa`,
  `clinica`, `paciente`), inclusive as pastas `prosa/` e `analise/` na raiz.
- UI em pt-BR, seguindo o visual do quickstart.
- A tela de simulação do vendedor conecta de verdade no agente da Agora.
- Dados mockados por enquanto, com um `data-provider` como ponto único de troca
  para quando o back-end existir.

---

## A. Classificação dos arquivos atuais

### Núcleo Agora — manter e reaproveitar

- `app/api/generate-agora-token/route.ts`
- `app/api/invite-agent/route.ts` (adaptar persona → cliente virtual)
- `app/api/stop-conversation/route.ts`
- `app/api/chat/completions/route.ts`
- `components/ConversationComponent.tsx` (remover acoplamento Prosa)
- `components/QuickstartConversationLayout.tsx`
- `components/QuickstartTranscriptPanel.tsx`
- `components/QuickstartPipelineMetrics.tsx`
- `components/ConnectionStatusPanel.tsx`, `ConversationErrorCard.tsx`,
  `ErrorBoundary.tsx`, `LoadingSkeleton.tsx`, `MicrophoneSelector.tsx`,
  `QuickstartPreCallCard.tsx`
- `lib/agora.ts`, `lib/conversation.ts`, `lib/chat-completions.ts`, `lib/utils.ts`
- `components/ui/button.tsx`, `components/ui/dropdown-menu.tsx`
- `types/conversation.ts` (limpar `prosa_sessao_id`), `types/env.d.ts`, `types/jsx.d.ts`
- `hooks/use-mobile.tsx`

### Prosa / demos antigas — apagar

- Libs: `lib/clara.ts`, `lib/brincadeiras.ts`, `lib/gravador.ts`,
  `lib/prosa-api.ts`, `lib/prosa-chat-completions.ts`, `lib/vozativa-data.ts`
- Hooks: `hooks/use-prosa.ts`, `hooks/use-vozativa-bridge.ts`
- Componentes: `components/TelaUmBotao.tsx`, `components/vozativa/`
- Rotas: `app/clinica/`, `app/paciente/`, `app/vozativa/`
- Tipos: `types/vozativa.ts`
- Services: `services/audioMeter.ts`, `services/sessionBridge.ts`
  (confirmar que o núcleo não importa antes de apagar)
- Pastas na raiz: `prosa/`, `analise/`

### Edições para desacoplar o Prosa

- `components/LandingPage.tsx`: remover `abrirSessao`, `TelaUmBotao`, `PESSOA_ID`.
- `components/ConversationComponent.tsx`: remover `useProsa`, `PALAVRAS_MEMORIA`,
  `prosa.encerrar()`.
- `app/api/invite-agent/route.ts`: trocar persona Clara por cliente virtual.
- `types/conversation.ts`: remover `prosa_sessao_id` / `prosaSessaoId`.
- `env.local.example`: remover bloco Prosa.

---

## B. Rotas (App Router)

```
app/
├── page.tsx                      → seleção de perfil (Gestor / Vendedor)
├── gestor/
│   ├── layout.tsx
│   ├── page.tsx                  → dashboard da equipe
│   ├── biblioteca/page.tsx       → produtos, materiais, políticas
│   ├── cenarios/
│   │   ├── page.tsx
│   │   ├── novo/page.tsx         → construtor de simulação
│   │   └── [cenarioId]/page.tsx
│   ├── criterios/page.tsx        → rubrica (critérios + pesos)
│   ├── vendedores/
│   │   ├── page.tsx
│   │   └── [vendedorId]/page.tsx
│   └── avaliacoes/[avaliacaoId]/page.tsx
├── vendedor/
│   ├── layout.tsx
│   ├── page.tsx                  → minhas simulações
│   ├── simulacao/[cenarioId]/page.tsx   → chamada por voz (núcleo Agora)
│   └── resultado/[avaliacaoId]/page.tsx
└── api/  (rotas Agora mantidas/adaptadas)
```

## C. Componentes novos

```
components/
├── layout/      → AppShell, SidebarGestor, SidebarVendedor, TopBar, ProfileSwitcher
├── gestor/      → TeamOverviewCard, VendedorRow, ScenarioCard, ScenarioBuilderForm,
│                  RubricEditor, KnowledgeUploader
├── vendedor/    → AssignmentCard, SimulationLauncher, FeedbackReport
├── simulacao/   → SimulationStage, PreCallScenarioCard
├── avaliacao/   → ScoreCard, CriteriaBreakdown, EvidenceQuote
└── shared/      → PageHeader, EmptyState, StatusBadge, DifficultyTag
```

## D. Dados / tipos

```
lib/
├── types/produto.ts, material.ts, cenario.ts, criterio.ts,
│         vendedor.ts, atribuicao.ts, avaliacao.ts
├── mock/              → fixtures de demo
├── data-provider.ts   → interface única (mock hoje, API amanhã)
└── cenario-prompt.ts  → monta o prompt do cliente virtual a partir do cenário
```

## E. Agente por cenário

`invite-agent/route.ts` recebe o cenário no body e monta `instructions`/
`greeting` com `cenario-prompt.ts`: persona, objeções, dificuldade, objetivo.
ASR já em pt-BR (reaproveitado).

## F. Fora de escopo

Auth real, CRM, certificação, avatares, gamificação, e a lógica de avaliação
por LLM (back-end). O front só exibe o resultado.

---

## Ordem de execução

1. Limpeza: apagar Prosa/demos e desacoplar núcleo. `pnpm typecheck` + `lint` verdes.
2. Esqueleto de rotas, tipos e `data-provider` com mocks.
3. Tela de simulação por voz ligada ao cenário (voz funcionando).
4. Dashboards do gestor/vendedor e tela de avaliação consumindo mocks.

---

## Status da implementação (concluído)

Etapas 1–4 implementadas e verificadas (`pnpm typecheck`, `lint`, `verify:api`,
`build` — todos verdes).

### Removido
- Pastas na raiz: `prosa/`, `analise/`.
- Rotas/demos antigas: `app/app/clinica`, `app/app/paciente`, `app/app/vozativa`.
- Libs/hooks/componentes do Prosa e VozAtiva (clara, brincadeiras, gravador,
  prosa-api, prosa-chat-completions, vozativa-data, use-prosa,
  use-vozativa-bridge, TelaUmBotao, components/vozativa, services, types/vozativa,
  public/prosa-worklet.js, components/LandingPage.tsx).

### Núcleo Agora adaptado
- `app/api/invite-agent/route.ts`: agente agora interpreta o CLIENTE do cenário
  (persona montada por `lib/cenario-prompt.ts`), recebe `cenario_id` no body.
- `app/api/chat/completions/route.ts`: restaurado para o handler padrão do
  quickstart (Custom LLM opcional).
- `components/ConversationComponent.tsx`: desacoplado do Prosa.
- `components/simulacao/VoiceSimulation.tsx`: substitui a antiga LandingPage,
  parametrizado por cenário.
- `types/conversation.ts`, `env.local.example`, `scripts/verify-api-contracts.ts`:
  atualizados.

### Criado
- Rotas de Gestor e Vendedor (ver seção B), seleção de perfil em `/`.
- Tipos em `lib/types`, mocks em `lib/mock/data.ts`, `lib/data-provider.ts`,
  `lib/cenario-prompt.ts`, `lib/sessao-demo.ts`.
- Componentes: `layout/AppShell`, `shared/*`, `gestor/*`, `vendedor/*`,
  `simulacao/*`, `avaliacao/*`, `ui/card`.

### O que precisa do back-end (ainda mockado)
- Persistência de materiais, cenários, critérios e atribuições.
- Avaliação por LLM com rubrica (o front já exibe o resultado via
  `FeedbackReport`).
- Autenticação real (hoje o perfil e o "vendedor atual" são mockados em
  `lib/sessao-demo.ts`).
- Para a voz funcionar, `.env.local` precisa das credenciais da Agora
  (`NEXT_PUBLIC_AGORA_APP_ID`, `NEXT_AGORA_APP_CERTIFICATE`).

---

## Loop conversa → avaliação → dashboard (implementado)

Ao encerrar a simulação, o veredito vira uma `Avaliacao` persistida e o painel
reflete o resultado, sem back-end:

- `lib/mock/store.ts`: store mutável em memória (semeado pelos fixtures,
  preservado no `globalThis` contra hot-reload). `salvarAvaliacao` grava a
  avaliação, marca a atribuição como concluída e recalcula a média do vendedor.
- `lib/avaliacao-from-veredito.ts`: mapeia o veredito binário para a `Avaliacao`
  (nota 100/0, uma linha por critério do veredito, evidência = frase).
- `lib/data-provider.ts`: passou a ler/escrever no store; novo
  `registrarAvaliacao`.
- Fluxo: `AssignmentCard` manda `?atribuicao=<id>` para a simulação →
  `VoiceSimulation` devolve o veredito no `onFinish` → a página persiste e
  navega para `/vendedor/resultado/<id>`.
- Verificação: `scripts/verify-loop.ts` (mapeamento apto/não apto, persistência,
  atribuição concluída, média recalculada).

Limitação declarada: o store vive na memória de uma instância e some num reload
completo. Suficiente para a demo; a interface do `data-provider` está pronta
para trocar por banco.
