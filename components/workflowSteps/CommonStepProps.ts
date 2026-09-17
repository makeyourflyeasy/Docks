import React from 'react';
import { Case, CaseStepDetail, Vehicle } from '../../types';

export interface CategoryStepRendererProps {
  stepIndex: number;
  formData: CaseStepDetail;
  setFormData: React.Dispatch<React.SetStateAction<CaseStepDetail>>;
  targetCase: Case;
  setActivePdfPreview: (preview: { url: string; title: string } | null) => void;
  isReadOnly?: boolean;
  availableVehicles?: Vehicle[];
  onTriggerIncident?: () => void;
  onDestinationArrivalPhotoUploaded?: (photoUrl: string) => void;
}
