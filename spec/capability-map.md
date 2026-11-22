# Capability Map: UNMUTE — Treinador Vocal para Parkinson (V2 / pivot)

| Module id | Responsabilidade | Depende de | Estado vs V1 |
|---|---|---|---|
| `platform` | Next.js (starter Agora), tokens, start/stop do agente, **registro de sessões + rota `/api/agent/coach` (think/say)** | — | estende |
| `voice-agent` | Persona Gabriel **treinador vocal**, prompt que interpreta mensagens `[APP]`, guardrails (sem diagnóstico; disfagia → avisa fono), turn detection | `platform` | reescreve prompts |
| `edge-listener` | Vosk local com gramática **"vamos treinar"** → `EdgeTrigger`; impacto desligado | — | troca gramática |
| `vocal-metrics` | Funções puras: dBFS, voz habitual, esforço relativo, detecção de tentativa, tempo de fonação, status da sessão, léxico de disfagia | — | novo (reaproveita `segmentSpeech`, `detectSymptoms`) |
| `clinic-sync` | Signaling `clinic-central`: `PROTOCOL_UPDATE`/`ACK` (painel→hub), `PRACTICE_TELEMETRY_UPDATE`, `TRANSCRIPT_LINE` (hub→painel) | `platform` | contratos v2 |
| `hub` | Tela do paciente: standby por voz, **máquina de estados do treino**, medidor de volume gigante, mute do uplink durante a tentativa, recuperação de falhas | todos acima | reescreve fluxo |
| `dashboard` | Tela da fono: carteira Parkinson, gráfico 14 dias (esforço dB + "Aaa" s), barras por tentativa ao vivo, **editor de protocolo** | `clinic-sync`, `vocal-metrics` (tipos) | adapta |

Ordem de construção: `P0 spike think()` + `contratos v2` → (`voice-agent`, `vocal-metrics`, `edge-listener`, `dashboard` em paralelo) → integração `hub` → ensaio

Alocação (4 pessoas):
- **A:** P0 spike → `platform` (coach route) → `voice-agent` → integração no `hub`
- **B:** `edge-listener` (gramática) → UI do `hub` + medidor
- **C:** contratos v2 → `vocal-metrics` (testes) → `practice-machine`
- **D:** `dashboard` + editor de protocolo → pitch, slides, vídeo
