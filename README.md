# Espiral — mapa de objetivos

App leve (PWA, menos de 200 KB) para transformar objetivos em caminhos, planejar a semana e receber lembretes.
Sem servidor, sem conta e sem IA. Os dados ficam no aparelho (localStorage).

## Instalar

O app precisa ser aberto pelo link publicado (https). Arquivo local não instala.

- **iPhone / iPad:** abra o link no Safari → Compartilhar → Adicionar à Tela de Início.
- **Android:** abra no Chrome → menu ⋮ → Instalar app.
- **Mac (Monterey) / Windows:** abra no Chrome ou Edge → ícone de instalar na barra de endereço. O Safari do Monterey não instala apps da web.

Dentro do app, o botão **⤓ Instalar** aparece quando o navegador permite instalar.

## Lembretes

Na página de um objetivo, **⏰ Criar lembrete**: escolha dias, hora e duração.

- **Adicionar ao Google Agenda:** abre o Google Agenda com um evento semanal já preenchido (título, próximo passo e link do app). A notificação vem da agenda, então chega mesmo com o Espiral fechado, em qualquer aparelho.
- **Outra agenda (.ics):** baixa um arquivo com alarme na hora do evento para a Agenda do iPhone, o Outlook etc.

Em **⚙ Configurações** dá para criar o lembrete da revisão semanal.

## Dados

- Cada aparelho tem os próprios dados (sem sincronização por enquanto).
- Para levar de um aparelho a outro: ⚙ → Exportar e, no outro, ⚙ → Importar.
- No iPhone, use o app instalado na Tela de Início: no Safari comum, o sistema pode apagar dados de sites pouco usados.

## Afazeres sincronizados (`afazeres.json`)

O arquivo `afazeres.json` guarda uma lista de afazeres mantida no repositório. Ao abrir com internet (e ao voltar para o app), o Espiral lê esse arquivo e mescla com os dados do aparelho:

- Item com `id` novo aparece no objetivo **Afazeres**. Nada do aparelho é apagado ou sobrescrito.
- Item excluído no aparelho não volta.
- `"feito": true` marca o item como feito uma vez; se você desmarcar no aparelho, vale o que está no aparelho.
- Tirar um item do arquivo não apaga nada no aparelho.

Para adicionar: inclua `{ "id": "af-algo-unico", "titulo": "...", "horas": 1 }` em `itens`. Não reaproveite `id`.

## Atualizações

Ao abrir com internet, o app busca a versão mais nova sozinho. Sem internet, abre a última versão salva.

## Arquivos

- `index.html`, `styles.css`, `app.js` — o app
- `afazeres.json` — lista de afazeres que o app mescla ao abrir
- `manifest.json`, `sw.js`, `icon*.png`, `icon.svg` — instalação e uso offline
