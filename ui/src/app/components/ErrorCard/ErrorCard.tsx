import {NeonErrorCardContent, NeonButton} from '@ps-refarch-ux/neon';
import React from 'react';

import './ErrorCard.scss';

interface ErrorCardProps {
  errorText: string;
  actionButton?: {
    text: string;
    onClick: () => void;
  };
  dataIllustration?: string;
}

export default function ErrorCard({
  errorText,
  actionButton,
  dataIllustration,
}: ErrorCardProps): React.ReactElement {
  return (
    <NeonErrorCardContent
      id="__mfe__powerftp-error"
      dataErrorText={errorText}
      dataIllustration={dataIllustration}
    >
      {actionButton && (
        <div data-slot="card-error-buttons">
          <NeonButton
            id="__mfe__error-action-btn"
            dataText={actionButton.text}
            dataType="primary"
            onClick={actionButton.onClick}
          />
        </div>
      )}
    </NeonErrorCardContent>
  );
}