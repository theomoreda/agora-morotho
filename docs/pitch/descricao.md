# Descrição do projeto (para a plataforma de submissão)

**Nome:** UNMUTE: Triagem Vocal Ativa + Escuta Edge para Home Care

**Problema:** idosos em atenção domiciliar ficam sozinhos entre as visitas. Esquecimento de doses, quedas e piora clínica passam despercebidos. Até 25% das internações de urgência em idosos têm relação com medicação. Interfaces com menus não funcionam para esse público, e a enfermagem gasta horas em ligações manuais de check-in.

**Público-alvo:** clínicas de Home Care (compradoras, B2B) e seus pacientes idosos crônicos ou pós-alta e familiares (usuários, B2C).

**Solução:** um hub residencial operado só por voz, em duas camadas:
1. **Escuta Edge local.** Reconhece "socorro", "ajuda" e "caí", e também impacto seguido de silêncio, direto no navegador com Vosk WASM. Nenhum áudio vai para a nuvem em repouso.
2. **Agente de voz ativo (Gabriel).** No horário do remédio, ou logo depois de um gatilho, conduz em pt-BR um check-in de 60 a 90 s ou uma verificação de emergência. Mede a latência de resposta e as pausas da paciente e compara com a linha de base pessoal dela. A central da clínica recebe transcrição, adesão ao remédio e alerta verde, amarelo ou vermelho em tempo real.

**Como usamos a Agora:**
- **Conversational AI Engine:** ASR Deepgram pt-BR e LLM gpt-4.1-mini em managed mode, TTS Fish Audio.
- **Turn detection por VAD calibrado para idosos:** 1,8 s de tolerância a silêncio, interrupção só com fala sustentada, lembrete de silêncio.
- **Agora Signaling (RTM):** barramento hub → central, com alertas entregues em ~200 ms e estado e transcrição do agente.
- **AI Noise Suppression** no microfone do hub.
- **Web SDK e Agent Client Toolkit** para eventos de estado e transcrição.
- **Agora CLI** para provisionar e diagnosticar o projeto.

**O que é simulado:** histórico de 14 dias e carteira de pacientes (fictícios, com selo na tela); botão de demonstração para o horário do check-in; botão de backup "Simular palavra-chave (simulado)".

**Código pré-existente:** starter oficial `agent-quickstart-nextjs` da Agora (MIT) e o modelo `vosk-model-small-pt-0.3` (Apache-2.0). Todo o resto foi feito no hackathon. Detalhes no README.
