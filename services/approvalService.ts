import { AppNotification, Case, Vehicle, UserRole } from '../types';
import { 
  saveNotificationToFirestore, 
  updateNotificationInFirestore,
  updateCaseInFirestore,
  deleteCaseFromFirestore,
  updateVehicleInFirestore,
  deleteVehicleFromFirestore
} from './dbService';

export interface ActionApprovalPayload {
  actionType: 'DELETE' | 'CANCEL' | 'EDIT';
  entityType: 'case' | 'vehicle';
  entityId: string | number;
  entityName: string;
  requestedBy: string;
  requestedByRole: string;
  reason: string;
  proposedChanges?: any;
  originalData?: any;
}

/**
 * Creates and submits an action approval request to Administrator
 * for Delete, Cancel, or Edit of a finalized Case.
 */
export async function submitCaseActionApproval(params: {
  actionType: 'DELETE' | 'CANCEL' | 'EDIT';
  caseItem: Case;
  requestedBy: string;
  requestedByRole?: string;
  reason: string;
  proposedChanges?: any;
}): Promise<{ notification: AppNotification; updatedCase: Case }> {
  const notifId = Date.now();
  const caseNo = params.caseItem.caseNumber || params.caseItem.caseNo || `Case #${params.caseItem.id}`;
  const actionLabel = params.actionType === 'DELETE' ? 'Deletion' : params.actionType === 'CANCEL' ? 'Cancellation' : 'Modification';

  const approvalData: AppNotification['approvalData'] = {
    entityType: 'case',
    entityId: params.caseItem.id,
    entityName: caseNo,
    actionType: params.actionType,
    requestedBy: params.requestedBy,
    requestedByRole: params.requestedByRole || 'Staff',
    reason: params.reason,
    proposedChanges: params.proposedChanges,
    originalData: params.caseItem
  };

  const notification: AppNotification = {
    id: notifId,
    title: `Case ${actionLabel} Request: ${caseNo}`,
    description: `Staff ${params.requestedBy} (${params.requestedByRole || 'Staff'}) has requested Admin approval to ${params.actionType} Case ${caseNo}. Reason: "${params.reason}"`,
    details: `Entity: Case ${caseNo}\nAction: ${params.actionType}\nRequester: ${params.requestedBy} (${params.requestedByRole || 'Staff'})\nReason: ${params.reason}${params.proposedChanges ? '\nChanges: ' + JSON.stringify(params.proposedChanges, null, 2) : ''}`,
    timestamp: new Date().toLocaleString(),
    type: 'ACTION',
    notificationSubType: params.actionType === 'DELETE' 
      ? 'DELETION_APPROVAL' 
      : params.actionType === 'CANCEL' 
        ? 'CANCELLATION_APPROVAL' 
        : 'EDIT_APPROVAL',
    status: 'PENDING',
    actionLabel: `Review ${actionLabel}`,
    priority: 'HIGH',
    targetView: 'cases',
    targetFilter: { caseId: params.caseItem.id },
    approvalData
  };

  const updatedCase: Case = {
    ...params.caseItem,
    pendingApproval: {
      type: params.actionType,
      reason: params.reason,
      requestedBy: params.requestedBy,
      requestedByRole: params.requestedByRole,
      requestedAt: new Date().toISOString(),
      proposedChanges: params.proposedChanges
    }
  };

  await Promise.all([
    saveNotificationToFirestore(notification),
    updateCaseInFirestore(updatedCase)
  ]);

  return { notification, updatedCase };
}

/**
 * Creates and submits an action approval request to Administrator
 * for Delete, Cancel, or Edit of a registered Vehicle.
 */
export async function submitVehicleActionApproval(params: {
  actionType: 'DELETE' | 'CANCEL' | 'EDIT';
  vehicleItem: Vehicle;
  requestedBy: string;
  requestedByRole?: string;
  reason: string;
  proposedChanges?: any;
}): Promise<{ notification: AppNotification; updatedVehicle: Vehicle }> {
  const notifId = Date.now();
  const regNo = params.vehicleItem.registrationNumber || `Vehicle #${params.vehicleItem.id}`;
  const actionLabel = params.actionType === 'DELETE' ? 'Deletion' : params.actionType === 'CANCEL' ? 'Cancellation' : 'Modification';

  const approvalData: AppNotification['approvalData'] = {
    entityType: 'vehicle',
    entityId: params.vehicleItem.id,
    entityName: regNo,
    actionType: params.actionType,
    requestedBy: params.requestedBy,
    requestedByRole: params.requestedByRole || 'Staff',
    reason: params.reason,
    proposedChanges: params.proposedChanges,
    originalData: params.vehicleItem
  };

  const notification: AppNotification = {
    id: notifId,
    title: `Vehicle ${actionLabel} Request: ${regNo}`,
    description: `Staff ${params.requestedBy} (${params.requestedByRole || 'Staff'}) has requested Admin approval to ${params.actionType} Vehicle ${regNo}. Reason: "${params.reason}"`,
    details: `Entity: Vehicle ${regNo}\nAction: ${params.actionType}\nRequester: ${params.requestedBy} (${params.requestedByRole || 'Staff'})\nReason: ${params.reason}${params.proposedChanges ? '\nChanges: ' + JSON.stringify(params.proposedChanges, null, 2) : ''}`,
    timestamp: new Date().toLocaleString(),
    type: 'ACTION',
    notificationSubType: params.actionType === 'DELETE' 
      ? 'DELETION_APPROVAL' 
      : params.actionType === 'CANCEL' 
        ? 'CANCELLATION_APPROVAL' 
        : 'EDIT_APPROVAL',
    status: 'PENDING',
    actionLabel: `Review ${actionLabel}`,
    priority: 'HIGH',
    targetView: 'vehicles',
    targetFilter: { vehicleId: params.vehicleItem.id },
    approvalData
  };

  const updatedVehicle: Vehicle = {
    ...params.vehicleItem,
    pendingApproval: {
      type: params.actionType,
      reason: params.reason,
      requestedBy: params.requestedBy,
      requestedByRole: params.requestedByRole,
      requestedAt: new Date().toISOString(),
      proposedChanges: params.proposedChanges
    }
  };

  await Promise.all([
    saveNotificationToFirestore(notification),
    updateVehicleInFirestore(updatedVehicle)
  ]);

  return { notification, updatedVehicle };
}

/**
 * Admin executes approval for a pending request
 */
export async function approveActionRequest(notification: AppNotification): Promise<void> {
  if (!notification.approvalData) {
    await updateNotificationInFirestore({ ...notification, status: 'RESOLVED' });
    return;
  }

  const { entityType, entityId, actionType, proposedChanges } = notification.approvalData;

  if (entityType === 'case') {
    if (actionType === 'DELETE') {
      await deleteCaseFromFirestore(String(entityId));
    } else if (actionType === 'CANCEL') {
      const casePayload = {
        id: String(entityId),
        status: 'CANCELLED',
        pendingApproval: undefined
      } as any;
      await updateCaseInFirestore(casePayload);
    } else if (actionType === 'EDIT') {
      const casePayload = {
        ...(proposedChanges || {}),
        id: String(entityId),
        pendingApproval: undefined
      } as any;
      await updateCaseInFirestore(casePayload);
    }
  } else if (entityType === 'vehicle') {
    if (actionType === 'DELETE') {
      await deleteVehicleFromFirestore(Number(entityId));
    } else if (actionType === 'CANCEL') {
      const vehiclePayload = {
        id: Number(entityId),
        status: 'CANCELLED',
        cancellationApproved: true,
        cancellationDate: new Date().toISOString().split('T')[0],
        pendingApproval: undefined
      } as any;
      await updateVehicleInFirestore(vehiclePayload);
    } else if (actionType === 'EDIT') {
      const vehiclePayload = {
        ...(proposedChanges || {}),
        id: Number(entityId),
        pendingApproval: undefined
      } as any;
      await updateVehicleInFirestore(vehiclePayload);
    }
  }

  await updateNotificationInFirestore({ ...notification, status: 'RESOLVED' });
}

/**
 * Admin rejects a pending request, dismissing changes and unlocking the entity
 */
export async function rejectActionRequest(notification: AppNotification, rejectReason?: string): Promise<void> {
  if (!notification.approvalData) {
    await updateNotificationInFirestore({ ...notification, status: 'REJECTED' });
    return;
  }

  const { entityType, entityId } = notification.approvalData;

  if (entityType === 'case') {
    await updateCaseInFirestore({
      id: String(entityId),
      pendingApproval: undefined
    } as any);
  } else if (entityType === 'vehicle') {
    await updateVehicleInFirestore({
      id: Number(entityId),
      pendingApproval: undefined
    } as any);
  }

  await updateNotificationInFirestore({
    ...notification,
    status: 'REJECTED',
    description: `${notification.description} [REJECTED BY ADMIN${rejectReason ? ': ' + rejectReason : ''}]`
  });
}
