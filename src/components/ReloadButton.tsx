import { Button, notification } from "antd";
import { useRef, useState } from "react";

import { ReloadOutlined } from "@ant-design/icons";

type ReloadButtonProps = {
  onReload: () => Promise<unknown>;
  loading?: boolean;
  disabled?: boolean;
};

const ReloadButton = ({ onReload, loading = false, disabled = false }: ReloadButtonProps) => {
  const [isReloading, setIsReloading] = useState(false);
  const pending = useRef(false);
  const [api, contextHolder] = notification.useNotification();

  const handleReload = async () => {
    if (disabled || loading || pending.current) return;
    pending.current = true;
    setIsReloading(true);
    try {
      await onReload();
    } catch {
      api.error({
        message: "Unable to reload data",
        description: "Please check your connection and try again.",
        placement: "bottomLeft",
      });
    } finally {
      pending.current = false;
      setIsReloading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Button
        aria-label="Reload data"
        title={disabled ? "Finish editing to reload data" : "Reload data"}
        onClick={handleReload}
        loading={loading || isReloading}
        disabled={disabled || loading || isReloading}
        type="primary"
        shape="round"
        icon={<ReloadOutlined />}
      />
    </>
  );
};

export default ReloadButton;
