// Função simples para estimar tokens (aproximadamente 4 caracteres por token)
export function countTokens(text: string): number {
  if (!text) {
    return 0;
  }

  // Uma estimativa aproximada baseada no comprimento do texto
  return Math.ceil(text.length / 4);
}
