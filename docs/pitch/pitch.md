# Pitch (3 min) + slides (≤ 10) + Q&A · UNMUTE

Formato no palco: **3 min de pitch + 2 min de demo ao vivo** (o vídeo é o backup), seguidos de 3 min de perguntas.
Os números vêm da tese ("Projeto UNMUTE … Modelo B2B2C para Home Care") e devem ser citados como tal.

## Slides (conteúdo)

Peso de cada slide entre parênteses, segundo os critérios de avaliação.

1. **Capa.** "UNMUTE: triagem vocal ativa para Home Care". Subtítulo: "Menos cliques. Mais cuidado." Nome do time.
2. **Problema** (relevância, 20%).
   - Entre uma visita e outra, o idoso fica sozinho.
   - **10–25% das internações de urgência em idosos** estão ligadas a eventos com medicação.
   - Os 30 dias após a alta são a janela crítica.
   - Aplicativos com menus não funcionam para idosos.
3. **Solução: arquitetura híbrida.**
   - Camada 1: escuta **Edge local**, sem áudio na nuvem.
   - Camada 2: **agente de voz ativo** na Agora, acionado por horário ou por gatilho.
4. **Experiência de voz** (25%). Turn detection calibrado para idosos:
   - espera 1,8 s de silêncio antes de responder;
   - não é interrompido por TV ou eco;
   - lembrete gentil depois de 8 s;
   - frases curtas, uma pergunta por vez;
   - regras de segurança clínica no prompt (não muda dose, não diagnostica).
5. **Biomarcadores vocais** (inovação, 15%).
   - Latência de turno e pausas são comparadas à **linha de base pessoal**, não à média da população.
   - Mostrar o gráfico de 14 dias com o ponto de hoje (213%).
6. **Arquitetura e uso da Agora** (25%). Diagrama: Hub (Vosk WASM + AI Noise Suppression) → ConvoAI Engine (Deepgram pt-BR, gpt-4.1-mini, Fish TTS) → Signaling `clinic-central` → Central.
   - Entrega do Signaling medida em ~200 ms.
7. **Diferencial vs. monitoramento passivo (ex.: Sensi.AI)**: privacidade por design, verificação ativa (descarta falso alarme) e custo de nuvem de ~2 min/dia por paciente.
8. **Modelo de negócio B2B2C e ROI.** SaaS de R$ 35 por paciente/mês. Clínica de 200 pacientes:
   - triagem de 16,6 h/dia → 2,5 h/dia;
   - cerca de R$ 4.500/mês a menos de OPEX (tese §3.3).
9. **Validação e próximos passos** (10%).
   - O que já está validado no protótipo: 136 testes automatizados, os 3 momentos ponta a ponta e o caso-ouro do PDF reproduzido.
   - Plano de validação real: piloto em shadow mode de 30 dias com 30 pacientes pós-alta.
   - Roadmap Q1–Q3: Device Kit + SIP, HL7 FHIR, modelos preditivos.
10. **Encerramento.** "O idoso não precisa aprender tecnologia. Só precisa falar." Contato.

## Script de fala (≈ 3 min, ~420 palavras)

> **[Slide 2]** Dona Helena tem 78 anos, teve alta há 12 dias e toma Losartana às 8h. Entre uma visita da enfermagem e outra, ela fica sozinha. Se ela esquecer o remédio ou cair, ninguém fica sabendo a tempo. E isso não é raro: até um quarto das internações de urgência em idosos tem a ver com medicação.
>
> **[Slide 3]** O UNMUTE é uma plataforma de triagem por voz que a clínica de Home Care oferece ao paciente. Ela funciona em duas camadas. Na primeira, um hub em casa escuta **só localmente**: o áudio não sai do aparelho e o custo em repouso é zero. Na segunda, no horário do remédio, ou quando a paciente diz "socorro", abrimos uma conversa de voz com o Gabriel, nosso agente sobre a Agora.
>
> **[Slide 4]** Projetamos a voz para idosos. O Gabriel espera quase dois segundos de silêncio antes de responder, não é interrompida pela televisão e faz uma pergunta por vez. E ele tem limites: não muda dose, não diagnostica, e encaminha qualquer queixa para a enfermagem.
>
> **[Slide 5]** Enquanto conversa, medimos quanto a paciente demora para responder e as pausas no meio da fala. Comparamos com **a linha de base dela mesma**, dos últimos 14 dias. Uma demora de quase 4 segundos, quando o normal dela é 1,2, é um sinal precoce de confusão, de sonolência por remédio ou de uma infecção.
>
> **[Slide 6]** Por baixo, usamos a Agora de ponta a ponta:
> - o Conversational AI Engine para a conversa em pt-BR;
> - o turn detection calibrado;
> - o AI Noise Suppression para o barulho da sala;
> - o Signaling, que leva cada alerta à central em cerca de 200 milissegundos.
>
> **[Slide 7]** Diferente do monitoramento passivo, nós não gravamos a casa inteira: perguntamos e confirmamos. Isso preserva a privacidade, descarta falsos alarmes e custa só uns 2 minutos de nuvem por dia.
>
> **[Slide 8]** O modelo é B2B2C. A clínica paga R$ 35 por paciente por mês. Numa carteira de 200 pacientes, a triagem cai de 16 para 2,5 horas de enfermagem por dia, e a clínica protege a receita de cada paciente que deixa de ser reinternado.
>
> **[Slide 9]** Hoje o protótipo roda ponta a ponta, com 136 testes automatizados. O próximo passo é um piloto de 30 dias em shadow mode com uma clínica parceira.
>
> **[Demo — 2 min, seguir o roteiro-video.md]**
>
> **[Slide 10]** A Dona Helena não precisa aprender tecnologia. Ela só precisa falar.

## Perguntas prováveis (Q&A)

| Pergunta | Resposta curta |
|---|---|
| **Isso é validado clinicamente?** | Não, ainda. Os limiares (+50%/+150%, 5 s) são configuráveis e estão rotulados como não validados. A literatura aponta latência e pausas como marcadores sensíveis, e o piloto em shadow mode existe justamente para calibrar contra desfechos reais. A ferramenta faz triagem; a decisão é da enfermagem. |
| **LGPD / privacidade?** | Em espera, o áudio é processado só no aparelho (Vosk WASM), e dá para ver na aba Network. A nuvem só abre em conversa agendada ou depois de um gatilho, e tratamos só transcrição e métricas. Os pacientes da demo são fictícios. |
| **E os falsos positivos do "socorro"?** | A gramática restrita do Vosk reduz disparos. Mesmo assim, todo gatilho passa por **verificação ativa por voz**: se a paciente responder com clareza que está bem, o caso é descartado sem acionar a enfermagem. |
| **Custo por paciente?** | A Agora cobra US$ 0,10/min do ConvoAI, com ASR e LLM inclusos no managed mode. São cerca de 2 min/dia, ou seja ~US$ 6/mês por paciente, dentro de uma assinatura de R$ 35. |
| **E se o idoso não tiver Wi-Fi?** | Está no roadmap do Q1: gateway SIP/PSTN da Agora, com o mesmo agente por ligação telefônica. |
| **Por que a Agora e não uma API de LLM direta?** | Latência e turn-taking em tempo real com idosos: VAD calibrável, interrupção controlada, supressão de ruído e Signaling para sincronizar a central, tudo na mesma rede SD-RTN. |
| **Como vocês medem a latência com precisão?** | É o fim do áudio do agente ouvido localmente até o início da fala da paciente no mesmo microfone, com o mesmo relógio. Descartamos 250 ms de eco. A medição é determinística e coberta por testes. |
| **O que foi feito no hackathon?** | Tudo, menos o starter oficial da Agora (Next.js, MIT) e o modelo Vosk (Apache-2.0). O README e o histórico de commits separam as duas coisas. |
