import { useGetAvailableAppPermissions } from "@dashboard/apps/hooks/useGetAvailableAppPermissions";
import { DashboardModal } from "@dashboard/components/Modal";
import { PermissionEnum, useAppQuery, useAppUpdatePermissionsMutation } from "@dashboard/graphql";
import useNotifier from "@dashboard/hooks/useNotifier";
import { Box, Skeleton, Text } from "@saleor/macaw-ui-next";
import React, { useEffect } from "react";
import { useIntl } from "react-intl";

import { AppPermissionsDialogConfirmation } from "./AppPermissionsDialogConfirmation";
import { AppPermissionsDialogPermissionPicker } from "./AppPermissionsDialogPermissionPicker";
import { useAppPermissionsDialogState } from "./AppPermissionsDialogState";
import { AppPermissionsDialogMessages } from "./messages";

const messages = AppPermissionsDialogMessages.dialogRoot;

interface AppPermissionsDialogProps {
  onClose: () => void;
  assignedPermissions: PermissionEnum[];
  appId: string;
}

export const AppPermissionsDialog = ({
  assignedPermissions,
  onClose,
  appId,
}: AppPermissionsDialogProps) => {
  const { availablePermissions } = useGetAvailableAppPermissions();
  const { formatMessage } = useIntl();
  const {
    updateSelected,
    onConfirmSelection,
    state,
    onBackFromConfirmation,
    selectedPermissions,
    onMutationError,
    onApprove,
  } = useAppPermissionsDialogState(assignedPermissions);
  const { refetch } = useAppQuery({
    variables: { id: appId, hasManagedAppsPermission: true },
    skip: true,
  });
  const notify = useNotifier();
  const [mutate] = useAppUpdatePermissionsMutation({
    onError(err) {
      onMutationError(err.message);
    },
    onCompleted(data) {
      if (data.appUpdate?.errors.length) {
        onMutationError(
          data.appUpdate?.errors[0].message ?? formatMessage(messages.fallbackErrorText),
        );

        return;
      }

      refetch().then(onClose);
      notify({
        status: "success",
        title: formatMessage(messages.successNotificationTitle),
        autohide: 1000,
        text: formatMessage(messages.successNotificationBody),
      });
    },
  });

  useEffect(() => {
    if (state.type === "saving") {
      mutate({
        variables: {
          permissions: state.selected,
          id: appId,
        },
      });
    }
  }, [state.type, appId]);

  const renderDialogContent = () => {
    switch (state.type) {
      case "pick-permissions":
        return (
          <AppPermissionsDialogPermissionPicker
            onClose={onClose}
            onChange={updateSelected}
            onSubmit={onConfirmSelection}
            allPermissions={availablePermissions}
            selected={selectedPermissions}
          />
        );
      case "confirm-permissions":
        return (
          <AppPermissionsDialogConfirmation
            addedPermissions={state.addedPermissions}
            removedPermissions={state.removedPermissions}
            onApprove={onApprove}
            onBack={onBackFromConfirmation}
          />
        );

      case "saving":
        return <Skeleton />;
      case "error":
        return (
          <Box padding={4}>
            <Text as={"p"} color="critical1">
              {state.error}
            </Text>
          </Box>
        );
    }
  };

  return (
    <DashboardModal open={true} onChange={onClose}>
      <DashboardModal.Content size="sm">
        <DashboardModal.Header>{formatMessage(messages.heading)}</DashboardModal.Header>
        <Box display={"grid"} gridAutoFlow={"row"}>
          <Text as={"p"}>{formatMessage(messages.info)}</Text>
          <Box
            borderRadius={2}
            marginBottom={6}
            marginTop={4}
            padding={4}
            backgroundColor="critical1Focused"
          >
            <Text marginBottom={2} as={"p"} color="warning1" size={4} fontWeight="bold">
              {formatMessage(messages.warningHeading)}
            </Text>
            <Text as={"p"}>{formatMessage(messages.warningParagraph1)}</Text>
            <Text as={"p"}>{formatMessage(messages.warningParagraph2)}</Text>
          </Box>
          {renderDialogContent()}
        </Box>
      </DashboardModal.Content>
    </DashboardModal>
  );
};
