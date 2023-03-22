import { Divider, Space } from "antd";
import React, { useState } from "react";

import { Platform } from "../../models/Platform";
import AccountsAddDropdown from "./AccountsAddDropdown";
import SelectedAccountInfo from "./SelectedAccountInfo";

const AccountView = () => {
  const [selectedPlatform, setSelectedStock] = useState<Platform | undefined>(
    undefined
  );

  return (
    <>
      <AccountsAddDropdown setSelectedAccount={setSelectedStock} />
      <Divider />
      {selectedPlatform && (
        <SelectedAccountInfo
          platform={selectedPlatform?.id}
          name={selectedPlatform?.name}
          account={selectedPlatform?.account?.id}
          accountName={selectedPlatform?.account?.code}
        />
      )}
    </>
  );
};

export default AccountView;
