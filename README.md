# Minha Coleção 🚗

Página web para visualizar e organizar coleções de miniaturas de carros (Hot Wheels, Matchbox, MiniGT e similares). Os dados são lidos diretamente de uma planilha do Google Sheets, sem necessidade de servidor ou banco de dados.

**Acesse:** [joaovomendes.github.io/colecao](https://joaovomendes.github.io/colecao)

---

## Funcionalidades

- Visualização em grade ou lista
- Filtro por marca (Hot Wheels, MiniGT, etc.)
- Busca por modelo ou montadora
- Foto de cada miniatura exibida diretamente do Google Drive
- Contador de total de peças, lacrados e valor investido
- Modal com detalhes completos ao clicar em qualquer card
- Carregamento automático da planilha (ID salvo no navegador)

---

## Como configurar

### 1. Criar a planilha no Google Sheets

1. Acesse [sheets.new](https://sheets.new) para criar uma nova planilha
2. Renomeie a aba para **`Respostas ao formulário 1`** (exatamente assim)
3. Na primeira linha, crie os seguintes cabeçalhos nas colunas A até K:

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| Carimbo de data/hora | Marca | Montadora | Modelo | Ano do carro | Ano de Lançamento | Série | Cor | Condição | Preço pago | Foto da Miniatura |

> Se usar o Google Forms vinculado (recomendado), os cabeçalhos são criados automaticamente.

---

### 2. Criar o formulário de cadastro

1. Na planilha, vá em **Ferramentas → Criar um formulário**
2. O Forms abrirá já vinculado à planilha
3. Adicione os campos na seguinte ordem:

| Campo | Tipo |
|---|---|
| Marca | Lista suspensa (Hot Wheels, Matchbox, MiniGT…) |
| Montadora | Resposta curta |
| Modelo | Resposta curta |
| Ano do carro | Número |
| Ano de Lançamento | Número |
| Série | Resposta curta |
| Cor | Resposta curta |
| Condição | Múltipla escolha (Lacrado / Aberto / Danificado) |
| Preço pago | Número |
| Foto da Miniatura | Upload de arquivo → apenas imagens |

4. Salve e copie o link do formulário para usar no celular

---

### 3. Tornar a planilha e as fotos públicas

**Planilha:**
1. Clique em **Compartilhar** no canto superior direito
2. Em "Acesso geral", selecione **Qualquer pessoa com o link**
3. Permissão: **Leitor**

**Pasta de fotos:**
1. Abra o Google Drive
2. Navegue até a pasta criada automaticamente pelo Forms (`Cadastro de miniatura`)
3. Clique com botão direito → **Compartilhar**
4. Em "Acesso geral", selecione **Qualquer pessoa com o link → Leitor**

---

### 4. Conectar a planilha à página

1. Abra a planilha no navegador
2. Copie o ID que aparece na URL:
   ```
   https://docs.google.com/spreadsheets/d/  **ESTE_TRECHO**  /edit
   ```
3. Acesse a página da coleção
4. Cole o ID no campo indicado e clique em **Carregar coleção**

O ID fica salvo automaticamente no navegador — nas próximas visitas a coleção carrega sozinha.

---

## Tecnologias

- HTML, CSS e JavaScript puro — sem frameworks ou dependências
- Google Sheets como banco de dados via API pública
- Google Drive para armazenamento das fotos
- Google Forms para cadastro de novas peças
- Hospedagem via GitHub Pages (gratuita)

---

## Estrutura do projeto

```
colecao/
└── index.html    ← página completa (tudo em um único arquivo)
```
