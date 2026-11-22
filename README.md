# UNMUTE: Triagem Vocal Ativa + Escuta Edge para Home Care

Protótipo do Hackathon **UNMUTE (Agora + NewHack)**, novembro de 2026. É um SaaS B2B2C: a clínica de Home Care contrata, e o idoso usa só a voz.

- **Hub do idoso (`/hub`):** fica em escuta **100% local**, sem enviar áudio à nuvem. Abre uma conversa de voz em pt-BR com o assistente "Gabriel" (Agora Conversational AI Engine) em dois casos: no horário do check-in de medicação, ou quando o idoso diz "socorro" ou cai.
- **Central de triagem (`/dashboard`):** a enfermagem vê, em tempo real (via Agora Signaling), a transcrição, a adesão ao remédio e os **biomarcadores temporais da fala**: latência de resposta e pausas, comparadas à linha de base pessoal do paciente. O alerta é verde, amarelo ou vermelho.

> Versão entregue: tag **`v1.0-hackathon`**. Especificação: [SPEC.md](SPEC.md) · Plano: [tasks/plan.md](tasks/plan.md)

## O problema

Idosos em atenção domiciliar ficam sozinhos entre as visitas. Esquecem doses, caem, e o estado clínico piora sem que ninguém perceba. A enfermagem de telemonitoramento gasta horas em ligações manuais repetitivas. Aplicativos com menus não funcionam para quem tem baixa visão, tremor ou declínio cognitivo leve.

## A solução, em 3 momentos (roteiro da demo)

| Momento | O que acontece | Onde a Agora entra |
|---|---|---|
| 1. Check-in normal | No horário do remédio, o Gabriel pergunta como a paciente está, se tomou a Losartana e se é de manhã, de tarde ou de noite. A paciente responde no ritmo de sempre (~1,2 s) e a central fica **verde**. | ConvoAI Engine (ASR → LLM → TTS), turn detection calibrado para idosos |
| 2. Hesitação | Na pergunta do remédio, a paciente demora ~4 s e diz "não lembro". O Gabriel **não interrompe** e acolhe sem alarmar. A central vira **vermelho**, com desvio de ~200% da linha de base e "medicação não confirmada". | VAD de fim de fala com 1.800 ms de tolerância, lembrete de silêncio, telemetria por Signaling |
| 3. Socorro | Em espera, a paciente diz "socorro". A palavra é reconhecida **no próprio navegador** (Vosk WASM). A central recebe o alerta **antes** de o Gabriel falar, e o Gabriel verifica por voz. Se a paciente responder "foi só um barulho", o caso é descartado como falso alarme. | Signaling (alerta imediato) + ConvoAI (verificação ativa) |

## Uso da Agora

| Componente | Uso no projeto |
|---|---|
| **Conversational AI Engine** | Agente "Gabriel" em pt-BR. ASR Deepgram nova-3 e LLM gpt-4.1-mini em *managed mode*; TTS Fish Audio com a voz escolhida pelo time. Prompts com regras de segurança clínica. Arquivo: `lib/voice-agent/` |
| **Turn detection (VAD)** | Fim de fala com `silence_duration_ms: 1800`; interrupção só com 400 ms de fala (600 ms enquanto o agente fala), para tolerar o eco do microfone do notebook; `silence_config` com o lembrete "Estou aqui, pode falar com calma." |
| **Agora Signaling (RTM)** | Barramento hub → central no canal `clinic-central`, com eventos validados (`lib/contracts.ts`). Também entrega ao hub o estado do agente e a transcrição. Entrega medida entre abas: ~200 ms |
| **Web SDK + Agent Toolkit** | RTC, eventos de estado do agente e transcrição ao vivo (`agora-agent-client-toolkit`) |
| **AI Noise Suppression** | `agora-extension-ai-denoiser` no microfone do hub, para TV, rádio e ventilador na sala |
| **Agora CLI** | `agora init` / `agora project doctor` para criar e validar o projeto |

## Biomarcadores e triagem

- **Latência de turno** = início da fala do paciente (VAD local no microfone) − fim do áudio do agente ouvido localmente. Os dois instantes vêm do mesmo relógio, sem diferença entre servidor e cliente. Os 250 ms logo após o fim da fala do agente são ignorados, para descartar o eco.
- **Pausas** são silêncios de mais de 800 ms dentro da resposta.
- **Linha de base** é a média das últimas 14 sessões. Nas 7 primeiras (calibração) valem só os limites absolutos.
- **Triagem** (`lib/vocal-biomarkers/triage.ts`):
  - 🔴 **vermelho:** sem resposta, remédio não confirmado, sintoma relatado, latência acima de 5 s ou desvio de 150% ou mais
  - 🟡 **amarelo:** desvio de 50% ou mais, ou 3 pausas longas ou mais
  - **Os limiares não foram validados clinicamente**, e o painel diz isso.

## Como rodar

Pré-requisitos:
- Node 22 ou superior, pnpm
- Uma conta Agora com um projeto que tenha ConvoAI e Signaling habilitados (padrão em projetos novos)
- Uma chave Fish Audio com uma voz (TTS)

```bash
pnpm install
agora login && agora project use "<seu projeto>"
agora project env write .env.local        # NEXT_PUBLIC_AGORA_APP_ID + NEXT_AGORA_APP_CERTIFICATE
# acrescente ao .env.local (modelo em env.local.example):
#   PROSA_FISH_API_KEY=...   PROSA_FISH_VOICE_ID=...
agora project doctor                       # tudo ✓
pnpm dev                                   # copia os WASM do denoiser e sobe http://localhost:3000
```

Abra duas janelas:
- `http://localhost:3000/dashboard`, a central da clínica (com `?dev=1` dá para injetar eventos simulados)
- `http://localhost:3000/hub`, o hub do idoso. Clique em **Ativar hub** e permita o microfone.
  - `?dev=1` mostra os níveis do microfone e do agente.
  - `?vad=0.08` ajusta o limiar do VAD.
  - `?denoiser=0` desliga o AI denoiser.

Páginas de verificação: `/dev/edge` (escuta local) e `/dev/sync` (Signaling entre abas).

| Comando | O que faz |
|---|---|
| `pnpm test` | 136 testes unitários (Vitest): biomarcadores, triagem, extração pt-BR, contratos, rastreador de sessão, estado do painel |
| `pnpm lint` · `pnpm typecheck` · `pnpm build` | Qualidade e build de produção |

Dependências principais: `next@16`, `react@19`, `agora-agents`, `agora-rtc-sdk-ng`/`agora-rtc-react`, `agora-rtm`, `agora-agent-client-toolkit`, `agora-extension-ai-denoiser`, `vosk-browser`, `recharts`.

## Estrutura

```
app/hub, app/dashboard          Telas 1 (idoso) e 2 (clínica)
app/api/invite-agent            Inicia o agente (modo checkin|emergency) via lib/voice-agent
lib/voice-agent/                Persona, prompts, guardrails, turn detection, vendors
lib/edge-listener/              Vosk WASM (gramática restrita) + detector de impacto e silêncio
lib/vocal-biomarkers/           Latência, VAD, linha de base, triagem, extração pt-BR
lib/hub/                        Rastreador de sessão, ciclo de vida do agente, denoiser
lib/clinic-sync/                Signaling hub → central
lib/dashboard/                  Reducer do painel
lib/contracts.ts                Contratos de eventos (schema do PDF §4.4 + extensões)
data/                           Pacientes fictícios e histórico simulado de 14 dias
```

## O que é simulado (rotulado na interface)

- **Histórico de 14 dias e carteira de pacientes:** dados fictícios e determinísticos (`data/seed-patients.ts`), com o selo "dados simulados".
- **Horário do check-in:** um botão de demonstração rotulado ("Simular horário do check-in (8h)") substitui o agendador.
- **"Simular palavra-chave (simulado)":** botão de backup caso o microfone do palco falhe. O fluxo normal usa a detecção real no navegador.
- **Hardware:** o hub roda num navegador, no lugar de um dispositivo dedicado (o regulamento não exige hardware).

## Privacidade e segurança

- **Áudio em espera:** é processado só no navegador. Depois do download único do modelo, nenhuma requisição de rede leva áudio. Dá para verificar na aba Network.
- **Credenciais:** ficam só no servidor, em `.env.local`, que não é versionado.
- **Pacientes:** todos fictícios.
- **Limites do agente:** é proibido de mudar dose, prescrever ou diagnosticar. Diante de qualquer queixa, encaminha para a enfermagem.

## Código pré-existente e licenças

| Componente | Origem | Licença |
|---|---|---|
| Base do app: rotas de token, start e stop, componentes `components/*` da página inicial | [AgoraIO-Conversational-AI/agent-quickstart-nextjs](https://github.com/AgoraIO-Conversational-AI/agent-quickstart-nextjs), gerado com `agora init --template nextjs` (commit `chore: scaffold…`) | MIT (ver `LICENSE`) |
| Modelo de fala `vosk-model-small-pt-0.3` (`public/models/`) | [alphacephei.com/vosk/models](https://alphacephei.com/vosk/models), reempacotado em `.tar.gz` | Apache-2.0 |
| `vosk-browser` | npm | Apache-2.0 |
| SDKs Agora (`agora-rtc-sdk-ng`, `agora-rtm`, toolkit, uikit, `agora-agents`) | npm | MIT / Apache / licença Agora |
| `agora-extension-ai-denoiser` (WASM **não versionado**; copiado de `node_modules` por `scripts/copy-denoiser-assets.mjs`) | npm | [Licença do SDK Agora](https://www.agora.io/en/sdk-licence-agreement/) |

Todo o resto foi construído durante o hackathon (21–22/11/2026): `lib/` (exceto `agora.ts`, `conversation.ts`, `utils.ts`, `chat-completions.ts`, que vêm do starter), `app/hub`, `app/dashboard`, `app/dev`, `components/hub`, `components/dashboard`, `data/`, a configuração do agente e os testes. O histórico de commits separa o que veio do starter do que foi feito no evento.

## Roadmap (pós-hackathon)

- **Q1:** hardware dedicado (Agora Convo AI Device Kit) e telefonia SIP/PSTN para lares sem Wi-Fi.
- **Q2:** pilotos em *shadow mode* de 30 dias com clínicas parceiras e integração HL7 FHIR (IW, Tasy, MV).
- **Q3:** análise acústica (F0, energia) correlacionada a desfechos clínicos para prever reinternações.
