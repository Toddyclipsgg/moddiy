import { memo } from 'react';
import type { JSONValue } from 'ai';
import { classNames } from '~/utils/classNames';
import { countTokens } from '~/utils/tokenCounter';

interface TokenDisplayProps {
  annotations?: JSONValue[];
  inputText?: string;
}

export const TokenDisplay = memo(({ annotations, inputText }: TokenDisplayProps) => {
  const filteredAnnotations = (annotations?.filter(
    (annotation: JSONValue) => annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
  ) || []) as { type: string; value: any }[];

  const usage: {
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
  } = filteredAnnotations.find((annotation) => annotation.type === 'usage')?.value;

  const inputTokens = inputText ? countTokens(inputText) : 0;

  if (!usage && !inputText) {
    return null;
  }

  if (inputText) {
    return (
      <div className={classNames('text-xs px-2 py-1', 'text-bolt-elements-textSecondary')}>tokens: {inputTokens}</div>
    );
  }

  return (
    <div className={classNames('text-xs px-2 py-1', 'text-bolt-elements-textSecondary flex flex-col gap-1')}>
      <div>Tokens: {usage.totalTokens}</div>
      <div>Prompt: {usage.promptTokens}</div>
      <div>Compl: {usage.completionTokens}</div>
    </div>
  );
});
