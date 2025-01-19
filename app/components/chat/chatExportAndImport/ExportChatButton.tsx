import WithTooltip from '~/components/ui/Tooltip';
import { IconButton } from '~/components/ui/IconButton';
import React from 'react';

export const ExportChatButton = ({ exportChat }: { exportChat?: () => void }) => {
  return (
    <WithTooltip tooltip="Export Chat">
      <IconButton title="Export Chat" onClick={() => exportChat?.()}>
        <div className="relative">
          <div className="i-ph:chat-circle text-xl"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="i-ph:arrow-down text-[0.8em]"></div>
          </div>
        </div>
      </IconButton>
    </WithTooltip>
  );
};
