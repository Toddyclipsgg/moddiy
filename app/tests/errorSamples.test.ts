import { describe, it } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Este arquivo não contém testes automatizados tradicionais.
 * Em vez disso, ele gera amostras de erros para testes manuais.
 * Execute este teste com `npm test -- app/tests/errorSamples.test.ts`
 * Os arquivos de saída serão gerados em /tmp/error-samples (ou similar no Windows)
 */

const ERROR_SAMPLES = [
  // Module errors
  {
    name: 'module_not_found.txt',
    content: `Error: Cannot find module 'react-query'
    at Function.Module._resolveFilename (node:internal/modules/cjs/loader:1075:15)
    at Function.Module._load (node:internal/modules/cjs/loader:920:27)
    at Module.require (node:internal/modules/cjs/loader:1141:19)
    at require (node:internal/modules/cjs/helpers:110:18)
    at Object.<anonymous> (/app/src/components/App.js:3:1)`,
  },
  {
    name: 'npm_404_error.txt',
    content: `npm ERR! code E404
npm ERR! 404 Not Found - GET https://registry.npmjs.org/react-quary - Not found
npm ERR! 404 
npm ERR! 404 react-quary@2.0.0 is not in the npm registry.
npm ERR! 404 You should bug the author to publish it (or use the name yourself!)
npm ERR! 404 
npm ERR! 404 Note that you can also install from a
npm ERR! 404 tarball, folder, http url, or git url.`,
  },
  {
    name: 'npm_version_conflict.txt',
    content: `npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR! 
npm ERR! Found: react@17.0.2
npm ERR! node_modules/react
npm ERR!   react@"^17.0.2" from the root project
npm ERR! 
npm ERR! Could not resolve dependency:
npm ERR! peer react@"^18.0.0" from @tanstack/react-query@4.0.0
npm ERR! node_modules/@tanstack/react-query
npm ERR!   @tanstack/react-query@"^4.0.0" from the root project
npm ERR! 
npm ERR! Fix the upstream dependency conflict, or retry
npm ERR! this command with --force, or --legacy-peer-deps`,
  },
  {
    name: 'multiple_module_errors.txt',
    content: `Error: Cannot find module 'react-dom'
    at /app/src/index.js:2:18
    
    Error: Cannot find module '@emotion/react'
    at /app/src/theme.js:1:22`,
  },

  // Goroutine errors
  {
    name: 'goroutine_pipe_error.txt',
    content: `goroutine 42 [running]:
runtime: too many writes on closed pipe
stack trace:
goroutine 42 [running]:
	github.com/evanw/esbuild/pkg/api.openChannel.func1(0xc0003a6000)
	/usr/local/go/src/runtime/panic.go:212 +0x55
	github.com/evanw/esbuild/pkg/api.(*apiImpl).Build(0xc0000ae180, {0xc0001de490, 0x1, 0x1})
	/usr/local/go/src/runtime/proc.go:203 +0x1fc
main.main()
	/tmp/esbuild/esbuild.go:15 +0x57
exit status 2`,
  },
  {
    name: 'goroutine_panic.txt',
    content: `goroutine 36 [running]:
panic: runtime error: invalid memory address or nil pointer dereference
[signal SIGSEGV: segmentation violation code=0x1 addr=0x0 pc=0x55d5f0]

stack trace:
goroutine 36 [running]:
	github.com/evanw/esbuild/pkg/api.(*dummyRenderer).RenderToken(0x0, {0xc0000, 0x9})
	/go/pkg/mod/github.com/evanw/esbuild@v0.14.39/pkg/api/api_impl.go:157 +0x55
	github.com/evanw/esbuild/pkg/api.(*Host).RenderToString(0xc00000e360, {0xc0001d6690, 0x1f})
	/go/pkg/mod/github.com/evanw/esbuild@v0.14.39/pkg/api/api_impl.go:664 +0xa5
main.main()
	./main.go:70`,
  },
  {
    name: 'multiple_goroutine_errors.txt',
    content: `goroutine 42 [running]:
runtime: too many writes on closed pipe

goroutine 36 [running]:
panic: fatal error: runtime: out of memory`,
  },

  // NPM specific errors
  {
    name: 'npm_version_not_found.txt',
    content: `npm ERR! code ETARGET
npm ERR! notarget No matching version found for react-dom@19.0.0.
npm ERR! notarget In most cases you or one of your dependencies are requesting
npm ERR! notarget a package version that doesn't exist.
npm ERR! 
npm ERR! The latest version of 'react-dom' is 18.2.0`,
  },
  {
    name: 'npm_permission_error.txt',
    content: `npm ERR! code EACCES
npm ERR! syscall access
npm ERR! path /usr/local/lib/node_modules
npm ERR! errno -13
npm ERR! 
npm ERR! Your cache folder contains root-owned files, due to a bug in
npm ERR! previous versions of npm which has since been addressed.
npm ERR! 
npm ERR! To fix this problem, please run:
npm ERR!   sudo chown -R 1001:1001 "/home/node/.npm"`,
  },

  // Mixed errors
  {
    name: 'mixed_errors.txt',
    content: `Error: Cannot find module 'react-dom'
    at Function.Module._resolveFilename (node:internal/modules/cjs/loader:1075:15)
    at Object.<anonymous> (/app/src/index.js:2:18)
    
    goroutine 42 [running]:
    runtime: too many writes on closed pipe
    stack trace:
    goroutine 42 [running]:
      github.com/evanw/esbuild/pkg/api.openChannel.func1(0xc0003a6000)`,
  },

  // Preview errors
  {
    name: 'vite_template_error.txt',
    content: `[[plugin:vite:react-babel] /home/project/src/App.tsx: Unterminated template. (154:3)
  155 |
/home/project/src/App.tsx:154:3
152|  
153|  export default App
154|  \`\`\`
   |     ^
155|]`,
  },
  {
    name: 'vite_syntax_error.txt',
    content: `[[plugin:vite:react-babel] /home/project/src/Component.tsx: Unexpected token (42:15)
  43 |  }
/home/project/src/Component.tsx:42:15
40|  const Component = () => {
41|    return (
42|      <div>Hello{
   |                ^
43|  }
44|  `,
  },
];

describe('Error Sample Generator', () => {
  it('should generate error samples for manual testing', () => {
    // Criar diretório temporário para os arquivos
    const tmpDir = process.env.TEMP || process.env.TMP || '/tmp';
    const sampleDir = path.join(tmpDir, 'error-samples');

    // Criar diretório de saída se não existir
    if (!fs.existsSync(sampleDir)) {
      fs.mkdirSync(sampleDir, { recursive: true });
    }

    // Gerar arquivos de amostra
    ERROR_SAMPLES.forEach((sample) => {
      const filePath = path.join(sampleDir, sample.name);
      fs.writeFileSync(filePath, sample.content);
      console.log(`Gerado: ${filePath}`);
    });

    // Gerar arquivo de comandos para teste
    const testCommandsPath = path.join(sampleDir, 'test_commands.sh');
    const commands = ERROR_SAMPLES.map(
      (sample) =>
        `echo "Testando ${sample.name}..."\ncat ${path.join(sampleDir, sample.name)} | node -e "const { processModuleErrors } = require('./app/utils/shell.js'); process.stdin.on('data', data => { const result = processModuleErrors(data.toString()); console.log(JSON.stringify(result, null, 2)); });"\necho "---------------------------------------------"\n`,
    ).join('\n');

    fs.writeFileSync(testCommandsPath, commands);
    console.log(`Gerado script de teste: ${testCommandsPath}`);

    console.log(`
======================================================
AMOSTRAS DE ERRO GERADAS EM: ${sampleDir}
======================================================

Para testar manualmente estas amostras, você pode:

1. Testar a detecção de erros via API diretamente no console:
   cat ${sampleDir}/module_not_found.txt | node -e "const { processModuleErrors } = require('./dist/utils/shell.js'); process.stdin.on('data', data => { const result = processModuleErrors(data.toString()); console.log(JSON.stringify(result, null, 2)); });"

2. Simular erros no terminal da aplicação:
   - Copie o conteúdo dos arquivos de amostra
   - Cole no terminal da aplicação
   - Observe o comportamento dos alertas

3. Executar o script de testes automatizado:
   sh ${testCommandsPath}
`);
  });
});
