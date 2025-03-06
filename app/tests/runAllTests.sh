#!/bin/bash

# Definir cores para saída
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}======================================================${NC}"
echo -e "${YELLOW}     TESTES DE DETECÇÃO DE ERROS EM EXECUÇÃO...       ${NC}"
echo -e "${YELLOW}======================================================${NC}"

# Verificar ambiente
if [ ! -d "app/tests" ]; then
  echo -e "${RED}Erro: Execute este script da raiz do projeto${NC}"
  exit 1
fi

# Executar testes unitários
echo -e "\n${YELLOW}Executando testes de detecção de erros de módulos...${NC}"
npx vitest run app/tests/errorDetection.test.ts --reporter=verbose
TEST1_RESULT=$?

echo -e "\n${YELLOW}Executando testes de detecção de erros de NPM...${NC}"
npx vitest run app/tests/chatAlert.test.tsx --reporter=verbose
TEST2_RESULT=$?

echo -e "\n${YELLOW}Executando testes de integração...${NC}"
npx vitest run app/tests/errorIntegration.test.ts --reporter=verbose
TEST3_RESULT=$?

# Gerar amostras de erro para testes manuais
echo -e "\n${YELLOW}Gerando amostras de erro para testes manuais...${NC}"
npx vitest run app/tests/errorSamples.test.ts --reporter=verbose
TEST4_RESULT=$?

# Verificar resultados
if [ $TEST1_RESULT -eq 0 ] && [ $TEST2_RESULT -eq 0 ] && [ $TEST3_RESULT -eq 0 ] && [ $TEST4_RESULT -eq 0 ]; then
  echo -e "\n${GREEN}======================================================${NC}"
  echo -e "${GREEN}     TODOS OS TESTES FORAM EXECUTADOS COM SUCESSO!    ${NC}"
  echo -e "${GREEN}======================================================${NC}"
  exit 0
else
  echo -e "\n${RED}======================================================${NC}"
  echo -e "${RED}     ALGUNS TESTES FALHARAM. VERIFIQUE OS ERROS.      ${NC}"
  echo -e "${RED}======================================================${NC}"
  exit 1
fi 