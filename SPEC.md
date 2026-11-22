# Spec: UNMUTE — Treinador Vocal por Voz para Parkinson (B2B2C) — V2 (pivot, Hackathon)

Status: **draft (pivot 21/11 23h)** · Prazo de submissão: **22/11/2026 12:00 (BRT)** · Pitch: 13:00 · Time: 4 pessoas · ~12 h de construção

> **Pivot.** A V1 (triagem de Home Care por latência de fala, ver git `56f8760..7d830c6`) foi substituída. A infraestrutura continua: agente pt-BR, Signaling, VAD local, Vosk e painel. Mudam o problema, o fluxo da sessão e as métricas.
> Mapa de módulos: [spec/capability-map.md](spec/capability-map.md). Plano: [tasks/plan.md](tasks/plan.md).

## Tese (para o pitch)

**B2B (quem paga, versão para a banca):**
- **Nossos** agentes de reabilitação vocal em tempo real (via Agora)
- **ajudam** clínicas de fonoaudiologia, reabilitação neurológica e Home Care
- **que querem** escalar o acompanhamento diário de pacientes com Parkinson entre as sessões presenciais
- **reduzindo** a baixa adesão aos exercícios domiciliares e a falta de métricas objetivas de evolução vocal
- **e aumentando** a retenção, a eficiência da equipe e a eficácia comprovada por dados de volume e clareza
- **diferente de** listas em papel e vídeos estáticos, que não ouvem, não corrigem e não motivam.

**B2C (quem usa, história da demo):** a Dona Helena tem Parkinson e voz fraca (hipofonia). Ela treina em casa só falando, sem menus pequenos nem botões difíceis para quem tem tremor, e recebe feedback imediato e acolhedor.

**Mercado (cunha → expansão):**
- **Cunha:** Parkinson, ~200 mil pessoas no Brasil, das quais ~90% perdem projeção vocal.
- **Expansão:** a mesma infraestrutura atende pós-AVC, presbifonia e pós-intubação.
- **Home Care formal no Brasil:** 1.160 empresas, 350 mil pacientes/ano, R$ 12,3 bi/ano.

**Pagadores:**
- clínicas, a ~R$ 35/paciente/mês
- operadoras e Home Care, pela internação por pneumonia aspirativa evitada
- filhos cuidadores

**Regulatório:** a fono é dona do protocolo e o agente só guia a prática, sem diagnóstico nem prescrição.

> Os números de mercado vêm do texto de contexto do time e **precisam de fonte citada nos slides** (T-PITCH).

## Objective

Construir um protótipo web com duas telas conectadas em tempo real pela Agora. Ele deve provar ao vivo, em até 2 min, o ciclo B2B2C:

1. **Painel da fono (B2B):** a fonoaudióloga define o protocolo (as 3 frases funcionais, a meta de esforço vocal e a meta de duração do "Aaa") e o envia ao paciente pela Agora Signaling. Ela acompanha a sessão ao vivo e a evolução de 14 dias.
2. **Hub do paciente (B2C):**
   - O idoso diz "Gabriel, vamos treinar". O reconhecimento é local (Vosk) e nenhum áudio vai à nuvem em standby.
   - O agente Gabriel (Agora Conversational AI Engine, pt-BR) conduz o treino: aquecimento com "Aaa" sustentado e depois as 3 frases ditas em voz forte.
   - O hub mede cada tentativa localmente e mostra um medidor grande com a faixa da meta.
   - O agente devolve um feedback falado, natural e baseado na medição real, injetada no LLM via `think()`.

**Usuários:**
- paciente com Parkinson, em casa
- fonoaudióloga da clínica

**Critérios dos jurados:** voz/interação 25%, execução + Agora 25%, problema 20%, inovação 15%, validação 10%, clareza 5%.

**Sucesso:** o roteiro da demo (Success Criteria) roda ao vivo de ponta a ponta, sem passos manuais escondidos. Tudo o que for simulado fica rotulado na tela.

## Decisões do pivot (tomadas com o usuário, 21/11 23h)

1. **Exercícios:** "Aaa" sustentado (volume + duração) + 3 frases funcionais em voz forte.
2. **A fono configura o protocolo** no painel, por um formulário simples. O protocolo chega ao hub ao vivo via Signaling (`PROTOCOL_UPDATE`).
3. **O Vosk passa a ser comando de voz para iniciar** ("vamos treinar"). Sai o "socorro" e sai o modo emergência.
4. **O fluxo do treino é orquestrado pelo hub, e o agente verbaliza.** Durante cada tentativa, o hub silencia o envio do microfone ao agente (`track.setMuted(true)`) e mede localmente. Depois injeta o resultado com `think()`. Motivos:
   - o ASR não sabe transcrever "Aaaa"
   - o VAD do agente fecharia o turno no meio do exercício
   - o LLM responderia antes de a medição existir
   Com o microfone silenciado, não há corrida entre a resposta do agente e a medição.

## Fatos verificados (docs Agora 21/11 + SDK `agora-agents@2.9.0` instalado)

| Fato | Fonte |
|---|---|
| Managed mode: ASR/LLM/TTS sem chaves de terceiros; 300 min grátis | docs.agora.io managed-mode.md, pricing.md |
| End-of-speech semântico só em en/zh; em pt-BR, VAD (`silence_duration_ms`) | ares.md, join.md |
| `AgentSession.think(text, { on_listening_action, on_thinking_action, on_speaking_action, interruptable })` injeta texto no LLM e faz o agente responder | `agentkit/AgentSession.d.mts:248`, `types.d.mts:184` |
| `AgentSession.say(text, { priority: INTERRUPT\|APPEND\|IGNORE, interruptable })` faz o TTS falar um texto fixo (fallback determinístico) | `AgentSession.d.mts:240` |
| `AgentSession.update(config)` atualiza o agente em execução (ex.: o prompt com o protocolo novo) | `AgentSession.d.mts:254` |
| Toolkit web: `agent-state-changed`, `transcript-updated`, `agent-metrics` | client-toolkit/web.md |
| O SDK tem avatares (Akool, HeyGen, Anam, LiveAvatar), mas todos exigem chave do fornecedor | `index.d.mts` (tipos `*AvatarOptions`) |

**A verificar no spike P0:**
- a latência e a semântica de `think()` com `on_listening_action: "inject"` versus `"interrupt"`
- se o `silence_config` dispara com o microfone silenciado
- se `think()` funciona no managed mode / LLM OpenAI

## Tech Stack (inalterada — sem dependências novas)

- **Base:** Next.js + TypeScript (starter oficial Agora), pnpm, Vitest, Recharts
- **Agora:**
  - `agora-rtc-sdk-ng`, `agora-rtm`, `agora-agent-client-toolkit` e `agora-extension-ai-denoiser`
  - no servidor, `agora-agents@2.9.0`
- **Agente:** Deepgram `nova-3` pt-BR (managed), `gpt-4.1-mini` (managed) e TTS Fish Audio BYOK com a voz do time
- **Edge:** `vosk-browser` + `vosk-model-small-pt-0.3`, servidos localmente
- **Medição de volume:** um **segundo** `getUserMedia({ autoGainControl: false, noiseSuppression: false, echoCancellation: true })` + `AnalyserNode`. A track RTC tem AGC e denoiser, que normalizam o volume e invalidariam a medida.

## Comportamento por módulo

### `platform`
- `POST /api/generate-agora-token` (inalterado).
- `POST /api/invite-agent { requester_id, channel_name, patient_id, protocol }` monta o agente coach e guarda o `AgentSession` num registro em memória (`Map<agentId, AgentSession>`). Isso é suficiente para a demo em localhost, porque um só processo `next dev` atende tudo.
- **Novo:** `POST /api/agent/coach { agent_id, text, mode: "think" | "say" }` chama `session.think()`. Se falhar, chama `session.say()` com o texto de fallback já pronto em pt-BR.
- `POST /api/stop-conversation` também remove a sessão do registro.

### `voice-agent` (persona Gabriel, nova)
- **Persona:** treinador vocal da clínica, caloroso e enérgico (o tom de "voz forte!" da terapia intensiva de volume), em frases curtas.
- **Saudação:** cumprimenta pelo nome e pergunta como ela está. A resposta serve para calibrar a **voz habitual**.
- **Mensagens com o prefixo `[APP]`** são medições do aplicativo, não fala da paciente. O agente:
  - transforma a medição em feedback falado, sem ler números técnicos
  - elogia o esforço, e se ficou abaixo da meta pede de novo, "mais forte, como se estivesse chamando alguém do outro lado da sala"
  - dá a próxima instrução que vier na mensagem
- **Guardrails:** não diagnostica, não altera o protocolo da fono e não promete melhora. Se ouvir relato de engasgo, tosse ao comer, dificuldade para engolir, dor ou queda, acolhe e diz que vai avisar a fonoaudióloga. Isso é registrado no painel.
- **Turn detection:** mantida da V1 (`silence_duration_ms: 1800`, `interrupt_duration_ms: 400`). O `silence_config` sobe para 20 s ou é desligado, conforme o P0, para o lembrete não disparar durante a tentativa silenciada.

### `vocal-metrics` (renomeia `vocal-biomarkers`; funções puras + Vitest)
- **Nível:** `levelDb(rms) = 20·log10(rms)`, em dBFS. Rotulado como **"dB relativo, não calibrado"**: não é dB SPL e depende da distância ao microfone. A UI pede "fique a um palmo do aparelho".
- **Voz habitual:** mediana do nível dos frames de fala (pelo `segmentSpeech` existente) na resposta à saudação. Fallback: o valor semeado do perfil.
- **Esforço relativo:** `effortDb = nível da tentativa (percentil 50 dos frames de fala) − voz habitual`.
- **Detecção da tentativa:**
  - a janela abre quando o agente termina de falar e o hub silencia o envio
  - a tentativa começa no primeiro trecho de fala de pelo menos 150 ms
  - a tentativa termina depois de 1 s de silêncio, ou no máximo em 15 s
  - se não houver fala em 8 s, a tentativa fica `no_attempt`
- **Tempo de fonação ("Aaa"):** duração do maior trecho contínuo acima do piso de voz.
- **Resultado:** `AttemptResult` em `lib/contracts.ts`. No fio ele usa snake_case:
  ```
  { exercise_id, kind: "sustain" | "phrase", attempt, phrase?,
    effort_db | null, duration_ms | null, target_effort_db, target_duration_ms | null,
    met_target, no_attempt, at }
  ```
- **Status da sessão:**
  - 🟢 `ON_TARGET`: a maioria dos exercícios atingiu a meta.
  - 🟡 `BELOW_TARGET`: esforço médio abaixo da meta, ou queda de pelo menos 3 dB em relação à média de 7 dias.
  - 🔴 `REVIEW`: queda de pelo menos 6 dB, 2 dias seguidos sem treino (vindo do seed) ou relato de engasgo/disfagia na conversa.
  - Os limiares ficam configuráveis e rotulados como "não validados clinicamente".
- **Extração por regras:** um léxico de disfagia e queixas (engasgo, engasguei, tosse ao comer, dificuldade para engolir, dor, caí, tontura), reaproveitando `detectSymptoms`.

### `clinic-sync` (contratos v2 — **re-freeze em P1, com ok das 4 pessoas**)
- O canal Signaling continua `clinic-central`.
- Contrato canônico: `lib/contracts.ts`, com os mocks do caso de ouro em `lib/mocks.ts`.
- `PROTOCOL_UPDATE` (painel → hub):
  ```
  { patient_id, protocol_version, protocol: {
      sustain: { target_duration_ms, attempts },
      phrases: string[3],
      target_effort_db
  }, updated_by, timestamp }
  ```
  - `protocolErrors()` valida o protocolo no editor e no parser.
  - O hub confirma com `PROTOCOL_ACK { patient_id, protocol_version }`.
- `PRACTICE_TELEMETRY_UPDATE` (hub → painel):
  - publicado a cada tentativa e no fim da sessão (`final`)
  - campos: `session_id`, `trigger` (`VOICE_COMMAND | BUTTON`), `protocol_version`, `attempts: AttemptResult[]`, `habitual_level_db`, `status`, `reasons`, `reported_symptoms`
- `TRANSCRIPT_LINE`: inalterado.
- Saem `CHECKIN_TELEMETRY_UPDATE` e `EMERGENCY_TRIGGER`.
- Latência alvo de hub → painel: menos de 1 s.

### `edge-listener`
- Gramática Vosk restrita: `["gabriel", "vamos treinar", "treinar", "[unk]"]`. A palavra "treinar" dispara `EdgeTrigger { kind: "keyword", keyword: "treinar" }`.
- O detector de impacto fica desligado.
- O indicador "Escuta local ativa — nada sai do aparelho" continua visível, e a escuta pausa durante a sessão.

### `hub` (Tela 1, paciente)
- Alto contraste, fonte de 32 px ou mais, sem menus.
- **Estados:**
  - Standby: "Diga: Gabriel, vamos treinar". Há também um botão grande, como fallback acessível.
  - Conversando
  - Exercício: instrução + **medidor de volume vertical gigante** com a faixa da meta, cronômetro no "Aaa" e a frase atual em letras grandes
  - Resultado: ✓ verde ou "mais forte!"
  - Concluído: resumo do dia
- **Máquina de estados do treino (cliente):**
  1. saudação e calibração da voz habitual
  2. `think`: explicar o "Aaa"
  3. tentativas do "Aaa"
  4. para cada frase: `think` pedindo a frase, depois a tentativa
  5. `think` com o resumo e a despedida
  6. stop
- **Recuperação de falhas:**
  - tentativa sem fala: `think` para incentivar e repetir uma vez, depois seguir
  - `think` falhou: `say` com o texto pronto
  - queda do agente: o status "Reconectando…" + o botão "Continuar treino" retomam do exercício atual
- O AI denoiser continua na track RTC. A medição usa o segundo stream, sem processamento.

### `dashboard` (Tela 2, fono)
- **Carteira:** 4 a 6 pacientes fictícios com Parkinson (e 1 com pós-AVC, para ilustrar a expansão). A protagonista é Helena Costa, 72 anos.
- **Card da paciente:**
  - status colorido
  - gráfico de 14 dias do **esforço vocal relativo (dB)** e do **tempo de "Aaa" (s)**, com o selo "dados simulados"
  - adesão: dias treinados nos últimos 14
  - ponto do dia ao vivo
- **Sessão ao vivo:** transcrição e uma barra por tentativa (esforço × meta).
- **Editor de protocolo:** 3 frases, meta de esforço (dB) e meta de "Aaa" (s), com o botão "Enviar ao paciente". O botão mostra "✓ recebido" quando chega o `PROTOCOL_ACK`.

## Commands

```
cd unmute
pnpm dev     # http://localhost:3000/hub  e  /dashboard
pnpm test    # vitest
pnpm lint
pnpm build
```

## Project Structure (delta)

```
lib/vocal-metrics/            # levelDb, habitual, attempt detection, session status (+ tests)
lib/hub/practice-machine.ts   # máquina de estados do treino (pura, testável)
lib/hub/level-meter.ts        # segundo getUserMedia sem AGC + AnalyserNode
lib/voice-agent/prompts.ts    # persona coach + mensagens [APP]
lib/voice-agent/sessions.ts   # registro em memória Map<agentId, AgentSession>
app/api/agent/coach/route.ts  # think() / say()
components/dashboard/ProtocolEditor.tsx, EffortChart.tsx
data/patients.ts, data/seed-patients.ts   # Parkinson, protocolo padrão, 14 dias simulados
```

## Testing Strategy

- **Vitest:**
  - `vocal-metrics`: dB, habitual, esforço, detecção da tentativa, tempo de fonação, status
  - `practice-machine`: a sequência, `no_attempt`, retomada
  - schema dos contratos v2
  - reducer do painel com `PROTOCOL_UPDATE` e `PRACTICE_TELEMETRY_UPDATE`
  - o caso de ouro: habitual −38 dBFS e tentativa −30 dBFS dão +8 dB, que atinge a meta de +6
- **Manual (antes da submissão):**
  - roteiro da demo 3 vezes seguidas sem falha
  - Network vazia em standby
  - teste com ruído ao fundo
  - distância do microfone padronizada (a um palmo)

## Boundaries

- **Always:**
  - rotular dados simulados e "dB relativo, não calibrado"
  - segredos só em `.env.local`
  - `pnpm test` antes de cada commit
  - pacientes fictícios
  - declarar no README o código pré-existente
  - **citar fonte** dos números de mercado nos slides
- **Ask first:**
  - trocar provedor de ASR/LLM/TTS
  - adicionar dependências (ex.: avatar)
  - mudar o roteiro da demo
  - mexer fora de `unmute/`
- **Never:**
  - commitar credenciais
  - enviar áudio de standby para a nuvem
  - o agente diagnosticar, prescrever ou alterar o protocolo da fono
  - usar a marca "LSVT LOUD" como se fosse nosso produto (dizer "inspirado em protocolos intensivos de volume vocal")
  - apresentar dado simulado como real
  - usar Web Speech API

## Success Criteria (roteiro da demo, ≤ 2 min)

1. **Protocolo ao vivo (B2B):** no painel, a fono troca a frase 3 por "Quero um café com leite" e envia. O hub mostra a frase nova em menos de 1 s, e o painel mostra "✓ recebido".
2. **Início sem toque:** em standby, dizer "Gabriel, vamos treinar" inicia a sessão em menos de 2 s, sem nenhuma requisição de áudio em standby.
3. **"Aaa" com feedback real:** a tentativa 1 fraca faz o agente pedir "mais forte" com naturalidade, citando o esforço. A tentativa 2 forte faz o medidor entrar na faixa verde e o agente comemorar. O feedback chega em até ~2 s após o fim da tentativa.
4. **Frases:** as 3 frases (com a nova) aparecem em letras grandes. Cada tentativa vira uma barra no painel em menos de 1 s.
5. **Fecho:** o agente faz o resumo e a despedida. O painel mostra o status final e o ponto do dia no gráfico de 14 dias.
6. **Robustez:**
   - uma tentativa em silêncio é tratada com acolhimento, sem travar
   - ruído ao fundo não interrompe o agente
7. `pnpm test` verde e `pnpm build` sem erros.
8. **Entregáveis às 12:00:**
   - repositório público + README
   - vídeo de até 2 min, **gravado até 08:00**
   - até 10 slides
   - descrição do projeto

## Out of Scope (Deferred → roadmap do pitch)

- Avatar (Akool/HeyGen/Anam): exige chave do fornecedor e aumenta a latência. Fica como stretch se tudo estiver verde até 07:00, com pedido de ok antes.
- dB SPL calibrado, análise de F0/prosódia e inteligibilidade (clareza) por ASR: roadmap Q2.
- Módulos pós-AVC e presbifonia: o pitch cita como expansão, sem protocolos próprios na demo.
- Login, banco de dados e multi-clínica: estado em memória/localStorage.
- Integração com prontuário, telefonia e hardware dedicado.
- Modo emergência e detector de impacto da V1: o código fica no histórico do git.
