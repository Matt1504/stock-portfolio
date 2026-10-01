import { Alert, Divider } from "antd";
import { useEffect, useMemo } from "react";
import { useQuery } from "@apollo/client";
import { useSearchParams } from "react-router-dom";

import AccountsAddDropdown from "./AccountsAddDropdown";
import SelectedAccountInfo from "./SelectedAccountInfo";
import { ALL_ACCOUNT_PLATFORMS } from "./gql";
import { AccountData, availableCurrencies, buildAccountOptions, findAccountOption, selectCurrency } from "./navigation";

const AccountView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, loading, error } = useQuery<AccountData>(ALL_ACCOUNT_PLATFORMS);
  const options = useMemo(() => buildAccountOptions(data), [data]);
  const accountId = searchParams.get("account");
  const currencyId = searchParams.get("currency");
  const selectedAccount = findAccountOption(options, accountId);
  const currencies = data?.currencies.edges.map(({ node }) => node) ?? [];
  const selectedCurrency = selectedAccount && selectCurrency(selectedAccount, currencies, currencyId, accountId);
  const selectedPlatform = selectedAccount?.platforms.find((platform) => platform.currency?.id === selectedCurrency?.id);

  useEffect(() => {
    // Add a default currency or replace an unavailable one without adding a
    // history entry. Do not modify deep links before metadata has loaded.
    if (selectedCurrency?.id && selectedCurrency.id !== currencyId) {
      const next = new URLSearchParams(searchParams);
      next.set("currency", selectedCurrency.id);
      setSearchParams(next, { replace: true });
    }
  }, [selectedCurrency?.id, currencyId, searchParams, setSearchParams]);

  const handleAccountChange = (id: string) => {
    const option = findAccountOption(options, id);
    if (!option) return;
    const currency = selectCurrency(option, currencies, currencyId);
    const next = new URLSearchParams(searchParams);
    next.set("account", option.id);
    if (currency?.id) next.set("currency", currency.id);
    else next.delete("currency");
    setSearchParams(next);
  };

  const handleCurrencyChange = (id: string) => {
    if (!selectedAccount || !availableCurrencies(selectedAccount, currencies).some((currency) => currency.id === id)) return;
    const next = new URLSearchParams(searchParams);
    next.set("currency", id);
    setSearchParams(next);
  };

  return (
    <>
      <AccountsAddDropdown
        data={data}
        loading={loading}
        options={options}
        selectedAccountId={selectedAccount?.id}
        onAccountChange={handleAccountChange}
      />
      <Divider />
      {error && <Alert type="error" showIcon message="Unable to load accounts. Please reload the page to try again." />}
      {data && accountId && !selectedAccount && <Alert type="warning" showIcon message="This account could not be found. Select an account above." />}
      {selectedAccount && !selectedCurrency && <Alert type="warning" showIcon message="No currency is available for this account." />}
      {selectedAccount && selectedCurrency && (
        <SelectedAccountInfo
          platform={selectedPlatform?.id}
          name={selectedAccount.name}
          account={selectedAccount.account.id}
          accountName={selectedAccount.account.code}
          currencies={data?.currencies.edges ?? []}
          currency={selectedCurrency}
          availableCurrencyIds={availableCurrencies(selectedAccount, currencies).map((currency) => currency.id!)}
          onCurrencyChange={handleCurrencyChange}
        />
      )}
    </>
  );
};

export default AccountView;
