# Script PowerShell para executar todos os testes

# Definir cores
function Write-ColorOutput {
    param ([string]$Text, [string]$Color)
    $originalColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $Color
    Write-Output $Text
    $host.UI.RawUI.ForegroundColor = $originalColor
}

Write-ColorOutput "======================================================" "Yellow"
Write-ColorOutput "     TESTES DE DETECÇÃO DE ERROS EM EXECUÇÃO...       " "Yellow" 
Write-ColorOutput "======================================================" "Yellow"

# Verificar ambiente
if (-not (Test-Path -Path "app/tests")) {
    Write-ColorOutput "Erro: Execute este script da raiz do projeto" "Red"
    exit 1
}

# Executar testes unitários
Write-ColorOutput "`nExecutando testes de detecção de erros de módulos..." "Yellow"
npx vitest run app/tests/errorDetection.test.ts --reporter=verbose
$test1Result = $LASTEXITCODE

Write-ColorOutput "`nExecutando testes de detecção de erros de NPM..." "Yellow"
npx vitest run app/tests/chatAlert.test.tsx --reporter=verbose
$test2Result = $LASTEXITCODE

Write-ColorOutput "`nExecutando testes de integração..." "Yellow"
npx vitest run app/tests/errorIntegration.test.ts --reporter=verbose
$test3Result = $LASTEXITCODE

# Gerar amostras de erro para testes manuais
Write-ColorOutput "`nGerando amostras de erro para testes manuais..." "Yellow"
npx vitest run app/tests/errorSamples.test.ts --reporter=verbose
$test4Result = $LASTEXITCODE

# Verificar resultados
if (($test1Result -eq 0) -and ($test2Result -eq 0) -and ($test3Result -eq 0) -and ($test4Result -eq 0)) {
    Write-ColorOutput "`n======================================================" "Green"
    Write-ColorOutput "     TODOS OS TESTES FORAM EXECUTADOS COM SUCESSO!    " "Green"
    Write-ColorOutput "======================================================" "Green"
    exit 0
} else {
    Write-ColorOutput "`n======================================================" "Red"
    Write-ColorOutput "     ALGUNS TESTES FALHARAM. VERIFIQUE OS ERROS.      " "Red"
    Write-ColorOutput "======================================================" "Red"
    exit 1
} 