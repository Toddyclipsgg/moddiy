import { memo } from 'react';
import { Markdown } from './Markdown';
import type { JSONValue } from 'ai';

interface AssistantMessageProps {
  content: string;
  _annotations?: JSONValue[];
}

export const AssistantMessage = memo(({ content, _annotations }: AssistantMessageProps) => {
  return (
    <div className="overflow-hidden w-full">
      <Markdown html>{content}</Markdown>
    </div>
  );
});
