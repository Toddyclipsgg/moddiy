# Testes de Detecção de Erros

Este diretório contém testes para validar o sistema de detecção de erros da aplicação. Os testes verificam se o sistema consegue identificar corretamente diferentes tipos de erros, incluindo erros de módulos, erros de goroutine e erros relacionados ao NPM.

## Arquivos de Teste

- `errorDetection.test.ts`: Testes unitários para as funções de detecção de erros individuais
- `chatAlert.test.tsx`: Testes para a função `getNpmErrorInfo` do componente `ChatAlert`
- `errorIntegration.test.ts`: Testes de integração entre a detecção de erros e o sistema de alertas
- `errorSamples.test.ts`: Gerador de amostras de erro para testes manuais

## Como Executar os Testes

### Executar Todos os Testes

#### No Windows:

```powershell
cd <raiz-do-projeto>
.\app\tests\runAllTests.ps1
```

#### No Linux/Mac:

```bash
cd <raiz-do-projeto>
./app/tests/runAllTests.sh
```

### Executar Testes Individuais

```bash
# Testes de detecção de erro
npm test -- app/tests/errorDetection.test.ts

# Testes de detecção de erro NPM
npm test -- app/tests/chatAlert.test.tsx

# Testes de integração
npm test -- app/tests/errorIntegration.test.ts

# Gerar amostras de erro para testes manuais
npm test -- app/tests/errorSamples.test.ts
```

## Amostras de Erro para Testes Manuais

O teste `errorSamples.test.ts` gera amostras de erros para testes manuais. Estes arquivos são gerados em:

- Windows: `%TEMP%\error-samples\`
- Linux/Mac: `/tmp/error-samples/`

Você pode usar estes arquivos para testar a detecção de erros manualmente:

1. Execute o teste para gerar as amostras:

   ```bash
   npm test -- app/tests/errorSamples.test.ts
   ```

2. Copie o conteúdo de um dos arquivos de amostra e cole no terminal da aplicação para observar como o sistema detecta e exibe o erro.

3. Alternativamente, você pode testar a função `processModuleErrors` diretamente:
   ```bash
   cat /tmp/error-samples/module_not_found.txt | node -e "const { processModuleErrors } = require('./dist/utils/shell.js'); process.stdin.on('data', data => { const result = processModuleErrors(data.toString()); console.log(JSON.stringify(result, null, 2)); });"
   ```

## Adicionando Novos Testes

Para adicionar testes para novos padrões de erro:

1. Adicione o padrão de erro ao arquivo `errorDetection.test.ts` na seção apropriada.
2. Adicione um exemplo do erro ao array `ERROR_SAMPLES` no arquivo `errorSamples.test.ts`.
3. Se o erro for específico do NPM, adicione um teste para ele em `chatAlert.test.tsx`.
4. Execute os testes para verificar se o novo padrão é detectado corretamente.

## Verificando a Cobertura de Testes

Para verificar a cobertura de testes, execute:

```bash
npm test -- --coverage
```

Isso gerará um relatório de cobertura na pasta `coverage/` na raiz do projeto.

## Solução de Problemas

Se os testes falharem, verifique:

1. Se o sistema de detecção de erros foi modificado sem atualizar os testes
2. Se os padrões de regex usados para detectar erros estão obsoletos
3. Se as interfaces de erro foram modificadas sem atualizar os testes
4. Se há problemas de ambiente, como versões incompatíveis de dependências

Se for necessário depurar os testes, você pode usar a opção `--inspect`:

```bash
node --inspect-brk ./node_modules/.bin/vitest run app/tests/errorDetection.test.ts
```
