import { NotificationComponent } from "../components/Notification";

export type TransactionWarning = { code: string; message: string };

export function transactionErrorMessage(error: unknown) {
  const apiError = error as { graphQLErrors?: { message: string }[]; message?: string } | undefined;
  return apiError?.graphQLErrors?.map(item => item.message).join("\n") || apiError?.message || "Could not save the transaction. Please try again.";
}

export function notifyTransactionSaved(notification: NotificationComponent, title: string, message: string, warnings?: TransactionWarning[]) {
  if (warnings?.length) notification.openNotificationWithIcon("warning", `${title} with warning`, warnings.map(warning => warning.message).join("\n"), 8);
  else notification.openNotificationWithIcon("success", title, message);
}
