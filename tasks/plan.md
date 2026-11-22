# Implementation Plan: UNMUTE — V2 (pivot Parkinson)

Fonte: [SPEC.md](../SPEC.md) · Mapa: [spec/capability-map.md](../spec/capability-map.md) · Tarefas: [todo.md](todo.md)
Plano V1 (Home Care): ver histórico do git (`git show 7d830c6:tasks/plan.md`).

## Linha do tempo (sáb 23h → dom 12h)

| Bloco | Horário | Meta |
|---|---|---|
| Phase 0 | 23:00–00:30 | P0 spike `think()` go/no-go · P1 contratos v2 congelados |
| Phase 1 | 00:30–04:00 | fatias isoladas em paralelo (agente coach, métricas, gramática, painel) |
| Phase 2 | 04:00–06:30 | hub integrado ponta a ponta; Success Criteria 1–5 uma vez |
| Phase 3 | 06:30–08:00 | calibração, robustez, **vídeo de backup gravado até 08:00** |
| Phase 4 | 08:00–11:30 | pitch/slides/README, 3 ensaios, submissão até 11:30 (margem de 30 min) |

## Architecture Decisions

- **O hub orquestra, o agente verbaliza.** O protocolo é uma máquina de estados pura no cliente (`lib/hub/practice-machine.ts`). O LLM recebe medições/instruções via `think()` com prefixo `[APP]` e as transforma em fala natural. Determinístico para a demo, natural para a banca.
- **Uplink silenciado durante a tentativa** (`localMicrophoneTrack.setMuted(true)`, não `close()`, respeitando a posse do hook): o agente não ouve "Aaaa", não fecha turno nem responde antes da medição.
- **Medição num segundo `getUserMedia` sem AGC/NS.** A track RTC continua com AEC/AGC/denoiser para a conversa; a medição precisa do volume bruto.
- **Esforço relativo à voz habitual do dia** (calibrada na resposta à saudação), não dB SPL — honesto e robusto a microfones diferentes, desde que a distância seja fixa.
- **Registro de sessões em memória no servidor** para chamar `think()`/`say()` pelo `agent_id`; basta para `next dev` em localhost.
- **Signaling continua o único barramento** hub ↔ painel, agora bidirecional (protocolo desce, telemetria sobe).

## Reaproveitamento da V1

| Mantém | Adapta | Remove da demo |
|---|---|---|
| token, invite/stop, RTM, `clinic-sync/connect.ts`, denoiser, `segmentSpeech`, `normalize`/`detectSymptoms`, layout do painel, tracker de estado do agente | prompts, contratos, seed, gráfico, reducer do painel, gramática Vosk, UI do hub | modo emergência, impacto, latência/pausas como métrica principal |

## Task List (detalhe em [todo.md](todo.md))

### Phase 0 — Riscos e contrato (23:00–00:30)
- [ ] P0 Spike `think()` + mute do uplink (A) — **go/no-go 00:15**
- [ ] P1 Contratos v2 + mocks + testes (C, todos revisam)

### Checkpoint 0 (00:30)
- [ ] Decisão P0 registrada · contratos congelados · `pnpm test` verde

### Phase 1 — Fatias isoladas (00:30–04:00)
- [ ] P2 Rota coach + registro de sessões (A)
- [ ] P3 Prompts do Gabriel coach + config (A)
- [ ] P4 `vocal-metrics` com testes (C)
- [ ] P5 `practice-machine` com testes (C)
- [ ] P6 Gramática "vamos treinar" + medidor de nível (`level-meter.ts`) (B)
- [ ] P7 Seed Parkinson + painel adaptado + editor de protocolo (D)
- [ ] P8 Reescrita do pitch: descrição, roteiro do vídeo, esqueleto de slides (D)

### Checkpoint 1 (04:00)
- [ ] Cada fatia demonstrável sozinha; `pnpm test` verde

### Phase 2 — Integração (04:00–06:30)
- [ ] P9 Hub: fluxo de treino ponta a ponta com agente (B + A)
- [ ] P10 Hub → painel: telemetria por tentativa + protocolo ao vivo (C + D)

### Checkpoint 2 (06:30)
- [ ] Success Criteria 1–5 rodam uma vez sem intervenção

### Phase 3 — Robustez e backup (06:30–08:00)
- [ ] P11 Calibração (limiares, distância, ruído) + recuperação de falhas (A + B)
- [ ] P12 Vídeo de backup ≤ 2 min **até 08:00** (D + apresentador)

### Phase 4 — Entrega (08:00–11:30)
- [ ] P13 README/disclosure/build/repo público (C) — lembrar: o usuário publica o repo
- [ ] P14 Slides finais (≤10) com fontes dos números + 3 ensaios cronometrados (todos)

## Risks and Mitigations

| Risco | Impacto | Mitigação |
|---|---|---|
| `think()` não funciona/lento no managed mode | Alto | P0 primeiro. **No-go:** `say()` com feedback templado em pt-BR gerado no cliente (ainda real, só menos variado) |
| Agente "fala por cima" ao receber `think()` enquanto ainda processa | Médio | `on_thinking_action/on_speaking_action: "interrupt"`; só chamar após estado `listening` |
| `silence_config` dispara durante tentativa silenciada | Médio | timeout 20 s ou desligado; tentativa máx. 15 s |
| AGC/denoiser contaminando a medida | Alto | segundo stream sem processamento (decisão de arquitetura) |
| Eco do TTS na medição | Baixo | janela de tentativa só abre após agente `listening` + 250 ms; uplink mudo |
| Variação de distância/microfone no palco | Médio | esforço relativo à voz habitual do dia; marca "um palmo"; calibração em P11 |
| Vosk confundir "treinar" | Médio | gramática restrita + botão grande de fallback, rotulado |
| Números de mercado sem fonte questionados | Médio | P14 cita fontes ou suaviza ("estimativa") |
| Escopo do pivot estourar | Alto | cortar em ordem: editor de protocolo → tempo de "Aaa" → resumo no gráfico; o núcleo é Aaa + 3 frases + feedback real |
