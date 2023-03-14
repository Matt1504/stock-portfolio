import { notification } from "antd";
import { NotificationInstance } from "antd/es/notification/interface";

type NotificationType = "success" | "info" | "warning" | "error";

export class NotificationComponent {
    api: NotificationInstance;
    contextHolder: any;

    constructor() {
        const [api, contextHolder] = notification.useNotification();
        this.api = api;
        this.contextHolder = contextHolder;
    }

    openNotificationWithIcon (type: NotificationType, message: string, description: string) {
        this.api[type]({
          message,
          description,
          placement: "bottomLeft",
          duration: 2,
        });
    }
}