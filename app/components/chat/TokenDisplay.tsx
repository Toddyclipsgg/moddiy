import { memo } from 'react';
import type { JSONValue } from 'ai';
import { classNames } from '~/utils/classNames';

interface TokenDisplayProps {
  annotations?: JSONValue[];
}

export const TokenDisplay = memo(({ annotations }: TokenDisplayProps) => {
  const filteredAnnotations = (annotations?.filter(
    (annotation: JSONValue) => annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
  ) || []) as { type: string; value: any }[];

  const usage: {
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
  } = filteredAnnotations.find((annotation) => annotation.type === 'usage')?.value;

  if (!usage) {
    return null;
  }

  return (
    <div className={classNames('text-xs px-2 py-1', 'text-bolt-elements-textSecondary')}>
      tokens: {usage.totalTokens} prompt: {usage.promptTokens} completion: {usage.completionTokens}
    </div>
  );
});
