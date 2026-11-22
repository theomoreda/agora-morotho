# UNMUTE — Task List (V2, pivot Parkinson)

Fonte: [plan.md](plan.md) · [SPEC.md](../SPEC.md). Comandos: `pnpm test`, `pnpm build`, `pnpm dev`.
Lista V1 concluída: `git show 7d830c6:tasks/todo.md`.

---

## Phase 0 — Riscos e contrato (23:00–00:30)

### P0: Spike `think()` + mute do uplink — A · **go/no-go 00:15**
- [x] Registro em memória `Map<agentId, AgentSession>` preenchido no invite (`lib/voice-agent/sessions.ts`, ligado em invite/stop)
- [x] `think("[APP] ...")` testado com agente real (`scripts/spike-think.ts`): API 300–900 ms; Agora recebe → **áudio começa em ~640 ms** (`speech_start_ms` no histórico). Total fim-da-tentativa → voz ≈ 1–1,5 s (< 2 s da SPEC)
- [x] `on_*_action: "interrupt"` faz o agente responder na hora; o LLM seguiu a instrução ("mais forte" / pediu a frase seguinte) mesmo com o prompt antigo. O `[APP]` fica no histórico com `start_type: api_think`
- [ ] `localMicrophoneTrack.setMuted(true)` por 10 s no navegador (precisa de humano + microfone) — testar em P9
- [x] `say()` funciona (API ~1,1 s)
- [x] **Decisão: GO com `think()`** · `say()` só como fallback · **`silence_config` removido** no modo treino: o hub cuida do "sem tentativa" via `think()` (sem risco de lembrete durante a tentativa silenciada)

**Verification:** manual em `/dev` ou `/hub` · **Files:** `lib/voice-agent/sessions.ts`, `app/api/agent/coach/route.ts` · **Scope:** S

### P1: Contratos v2 — C (todos revisam)
- [x] `lib/contracts.ts`: `PracticeProtocol` + `DEFAULT_PROTOCOL` + `protocolErrors()`, `AttemptResult`, `SessionStatus` (`ON_TARGET|BELOW_TARGET|REVIEW`), `ProtocolUpdate`, `ProtocolAck`, `PracticeTelemetryEvent`, `TranscriptLine`
- [x] V1 (`CHECKIN_TELEMETRY_UPDATE`/`EMERGENCY_TRIGGER` e tipos) **mantida como `@deprecated`** para o hub/painel atuais compilarem; apagar quando P7/P9 migrarem (busca: `@deprecated V1`)
- [x] `parseClinicEvent` valida os novos eventos (inclui tentativas aninhadas e protocolo)
- [x] `lib/mocks.ts`: caso Helena v2 `PK-2026-031` (habitual −38 dBFS; Aaa 1 +3 dB/6 s ✗, Aaa 2 +8 dB/9 s ✓; frase 3 "Quero um café com leite.")
- [x] `lib/contracts.test.ts` verde (18 testes; suíte total 146)

**Verification:** `pnpm test` · **Scope:** S

## Checkpoint 0 (00:30)
- [x] P0 decidido (GO `think()`) · contratos v2 prontos — **falta o ok das 4 pessoas para congelar** · `pnpm test` verde

---

## Phase 1 — Fatias isoladas (00:30–04:00)

### P2: Rota coach — A
- [x] `POST /api/agent/coach { agent_id, text, mode, fallback }` → `think()`; erro → `say(fallback)`; 404 se sessão não existe
- [x] `stop-conversation` remove do registro
- [x] `invite-agent` aceita `protocol` (validado por `protocolErrors`, 400 se inválido) e `patient_id`; modo padrão `practice`. `checkin`/`emergency` ficam como V1 deprecated até P9

**Verification:** `pnpm build` + chamada manual · **Scope:** S

### P3: Gabriel coach — A
- [x] `prompts.ts`: persona treinador vocal, regras das mensagens `[APP]` (não ler números técnicos, elogiar, pedir "mais forte", seguir próxima instrução), guardrails (disfagia/dor/queda → avisa fono; pedir para parar → respeita)
- [x] Saudação que pede resposta falada (calibração da voz habitual)
- [x] `config.ts`: protocolo no prompt, keywords ASR (nome, Gabriel, treinar, engasgo, engolir), sem `silence_config` no modo `practice`
- [x] `lib/hub/coach-messages.ts`: `coachMessage(step)` → `{ text [APP], fallback }` para start/result/resume; `verdict()` met/almost/below/none (puro, 11 testes)
- [x] `config.test.ts` atualizado (8 testes v2)
- [x] **Validado ao vivo** (`scripts/spike-think.ts`, modo practice): sem falar dB, frase repetida verbatim, 2 frases por resposta após ajuste do prompt. Ressalva: numa rodada chamou de "quase lá" um resultado ABAIXO — aceitável; revisar no ensaio

**Verification:** `pnpm test`; conversa manual · **Scope:** M

### P4: `vocal-metrics` — C
- [x] `level.ts`: `levelDb`, `habitualLevelDb(frames)` (mediana dos frames com voz, null se < 400 ms), `measureAttempt` (nível mediano, maior trecho contínuo = fonação, span = frase), `buildAttemptResult` → `AttemptResult` (Aaa exige esforço E duração; frase só esforço)
- [x] `attempt-detector.ts`: reducer em streaming `startDetector/stepDetector/framesOf` (início ≥150 ms, fim 1 s de silêncio, máx 15 s, `no_attempt` 8 s, ignora frames anteriores à janela)
- [x] `status.ts`: `sessionStatus(attempts, ctx)` + motivos em pt-BR, usando a **melhor tentativa por exercício**; `exerciseSummary` (alimenta o `NextStep` summary); `DYSPHAGIA_SYMPTOMS`
- [x] Léxico de disfagia em `extraction.ts` (engasgo, tosse ao comer/beber, dificuldade para engolir; respeita negação)
- [x] 29 testes (`metrics.test.ts`), incluindo o caso de ouro: frames sintéticos geram exatamente `mockAttemptWeak` e `mockAttemptStrong` · suíte total 194

**Verification:** `pnpm test` · **Files:** `lib/vocal-metrics/*` · **Scope:** M

### P5: `practice-machine` — C
- [x] Fases: `calibrating → intro → instructing ⇄ measuring → closing → done`; exercício atual `sustain(n)` / `phrase(i, tentativa)`
- [x] Eventos: `calibrated`, `agentDone` (só speaking → listening!), `attemptMeasured` (null = sem tentativa), `patientSaid` (sintomas), `protocolUpdated` (só antes do 1º exercício), `resume`
- [x] Efeitos: `coach` (think/say), `mute`, `measure { openedAt = fim do agente + 250 ms }`, `publish { final }`, `stop`; + `practiceView` (UI) e `practiceTelemetry` (evento v2 validado)
- [x] 14 testes: sessão de ouro completa (6 tentativas, 7 mensagens na ordem certa, mute só na medição, publish por tentativa + final, stop), sem tentativa, limite de tentativas, protocolo, disfagia → REVIEW ao vivo, retomada medindo/fechando · suíte total 208

**Verification:** `pnpm test` · **Files:** `lib/hub/practice-machine.ts(+test)` · **Scope:** M

### P6: Gramática + medidor — B
- [x] `keywords.ts`: gramática restrita ("gabriel vamos treinar", "vamos treinar", "treinar", "gabriel", `[unk]`), `matchKeyword` → `"treinar"` ("gabriel" sozinho não dispara); palavras confirmadas no vocabulário do modelo (`Gr.fst`); testes
- [x] Impacto opcional no listener (`impact` omitido = desligado, padrão v2)
- [x] `lib/hub/level-meter.ts`: segundo `getUserMedia` (AGC/NS off, AEC on), `AnalyserNode` a ~50 Hz emitindo `EnergyFrame` com `Date.now()`; expõe `settings` para confirmar AGC off
- [x] `components/hub/LevelMeter.tsx` (barra gigante, faixa verde = meta, linha da voz de costume, "Mais forte!/Quase lá!/Isso!", `role=meter`) + `lib/hub/meter-scale.ts` puro (escala −12…+18 dB, zonas, suavização ataque/soltura; 9 testes)
- [x] `/dev/meter`: liga o microfone, calibra a voz de costume (3 s), roda tentativa "Aaa"/frase pelo detector e mostra o `AttemptResult` — **base da calibração de palco (P11)**
- [ ] **Manual (humano):** abrir `/dev/meter`, conferir AGC=false, calibrar e fazer "Aaa" fraco/forte; ajustar `voiceFloorDb`/meta se preciso

**Verification:** `pnpm test`; `/dev/meter` manual; Network vazia em standby · **Scope:** M

### P7: Painel da fono — D
- [x] `data/seed-practice.ts` (novo; o `seed-patients.ts` V1 fica para o hub V1 até P9): 4 Parkinson + 1 pós-AVC (expansão); Helena melhorando (na meta), Antônio 2 dias sem treinar (revisar), José caindo (abaixo), Maria estável; 14 dias determinísticos rotulados "dados simulados"
- [x] `lib/vocal-metrics/history.ts`: média 7 treinos, dias sem treino, adesão, ponto do dia (o hub usa para o `StatusContext`)
- [x] Reducer v2 (`lib/dashboard/state.ts`): `PROTOCOL_UPDATE` (pendente, idempotente, ignora versão velha), `PROTOCOL_ACK`, `PRACTICE_TELEMETRY_UPDATE` (sessão ao vivo, ponto do dia no `final`, alerta ao virar REVIEW), `TRANSCRIPT_LINE`; ignora V1 · 12 testes
- [x] `EffortChart` (esforço dB + meta, barras do "Aaa", dias sem treino, ponto de hoje), KPIs (esforço hoje, média 7, melhor Aaa, adesão), barras por tentativa ao vivo, transcrição, alertas; `LatencyChart` V1 removido
- [x] `ProtocolEditor`: 3 frases, meta dB, meta Aaa s, tentativas; valida com `protocolErrors`; publica `PROTOCOL_UPDATE` (versão +1) pela Signaling; mostra "aguardando…" → "✓ recebido às hh:mm"
- [x] Conferido em screenshot headless (bug do botão "Enviar" sempre ativo encontrado e corrigido)
- [ ] **Manual:** `/dashboard?dev` com Signaling real; o ACK de verdade só existe depois do P10 (hub responde)

**Verification:** `pnpm test`; `/dashboard` com mocks · **Scope:** M

### P8: Pitch V2 — D
- [ ] `docs/pitch/descricao.md`, `pitch.md` (3 min: dor → demo → mercado cunha/expansão → modelo → por que agora → Agora), `roteiro-video.md`
- [ ] Esqueleto de ≤10 slides; lista de fontes a citar (Parkinson BR, % hipofonia, Home Care R$ 12,3 bi)

**Scope:** S

## Checkpoint 1 (04:00)
- [ ] Fatias demonstráveis sozinhas · `pnpm test` verde (frente A: P2/P3 ✓ · frente C: P4/P5 ✓ · B: P6 · D: P7/P8)

---

## Phase 2 — Integração (04:00–06:30)

### P9: Hub ponta a ponta — B + A
- [x] Standby (Vosk "vamos treinar" ou botão "Começar treino") → `startAgentSession('practice', id, protocolo atual)`; frases do dia visíveis no standby
- [x] `components/hub/PracticeSession.tsx` liga `practice-machine` a `AGENT_STATE_CHANGED` + `lib/hub/agent-done.ts` (fim real da fala: estado + 300 ms de áudio do agente em silêncio; 6 testes), `level-meter`, `setMuted`, `/api/agent/coach`; calibração da voz habitual na resposta à saudação (timeout 8 s → valor do perfil)
- [x] Telas: etapas (Aaa, Frase 1–3), instrução, medidor gigante, cronômetro do Aaa vs meta, frase em letras grandes, ✓/"Quase lá"/"Mais forte!", resumo e tela "Parabéns"
- [x] Recuperação: `think` não interrompível; agente mudo 5 s após `think` → reenvia com `say(fallback)`; 12 s sem atividade → botão "Continuar treino" (`resume`); tentativas < 400 ms descartadas (tosse/cauda de fala)
- [x] **E2E headless com agente real** (Chrome + microfone falso WAV, driver CDP em scratchpad): sessão completa calibração → 2 Aaa → 3 frases → resumo → "Parabéns", sem travar; achados corrigidos: `[APP]` aparecia como fala da paciente na transcrição, agente mudo após um `think`, rótulo quebrando
- [ ] **Manual (humano):** dizer "Gabriel, vamos treinar" e fazer o roteiro com voz real (o Vosk e o eco do alto-falante não são testáveis no headless)

**Verification:** Success Criteria 2, 3, 5, 6 · **Scope:** L (dividir se travar)

### P10: Sync bidirecional — C + D
- [x] Hub assina `PROTOCOL_UPDATE`, responde `PROTOCOL_ACK`, atualiza a tela em standby (destaque verde "Novo treino enviado…") e guarda em localStorage (`lib/hub/protocol-store.ts`)
- [x] Hub publica `PRACTICE_TELEMETRY_UPDATE` por tentativa e `final`; `TRANSCRIPT_LINE` (sem as injeções `[APP]`)
- [x] Painel reflete em < 1 s (E2E: protocolo painel → hub em 213–315 ms; ACK de volta em ~200 ms)

**Verification:** Success Criteria 1, 4, 5 · **Scope:** M

## Checkpoint 2 (06:30)
- [x] Success Criteria 1, 3 (fluxo), 4, 5 rodaram no E2E headless sem intervenção · falta o 2 (voz real "vamos treinar") e o 3 com voz humana

---

## Phase 3 — Robustez e backup (06:30–08:00)

### P11: Calibração — A + B
- [ ] Limiar de voz, piso, distância "um palmo", meta padrão realista para o apresentador
- [ ] Ruído ao fundo; tentativa em silêncio; agente caindo no meio

### P12: Vídeo de backup — D + apresentador · **até 08:00**

## Phase 4 — Entrega (08:00–11:30)

### P13: README + build — C
- [ ] README V2 (problema, como rodar, uso da Agora: ConvoAI, think/say, Signaling bidirecional, denoiser; código pré-existente e licenças)
- [ ] `pnpm test`, `pnpm lint`, `pnpm build` verdes
- [ ] Repo público: **o usuário publica** (não criar/pushar repo pelo agente)

### P14: Slides + ensaios — todos
- [ ] ≤10 slides com fontes · 3 ensaios cronometrados (3 min pitch + 2 min demo) · submissão até 11:30
