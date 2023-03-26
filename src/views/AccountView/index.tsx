import { Divider } from "antd";
import React, { useState } from "react";

import { Currency } from "../../models/Currency";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Platform } from "../../models/Platform";
import AccountsAddDropdown from "./AccountsAddDropdown";
import SelectedAccountInfo from "./SelectedAccountInfo";

const AccountView = () => {
  const [selectedPlatform, setSelectedStock] = useState<Platform | undefined>(
    undefined
  );
  const [currencies, setCurrencies] = useState<GraphQLNode<Currency>[]>([]);

  return (
    <>
      <AccountsAddDropdown
        setSelectedAccount={setSelectedStock}
        setCurrencies={setCurrencies}
      />
      <Divider />
      {selectedPlatform && (
        <SelectedAccountInfo
          platform={selectedPlatform.id}
          name={selectedPlatform.name}
          account={selectedPlatform.account?.id}
          accountName={selectedPlatform.account?.code}
          currencies={currencies}
        />
      )}
    </>
  );
};

export default AccountView;
