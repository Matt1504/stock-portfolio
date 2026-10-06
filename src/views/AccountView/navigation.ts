import { Account } from "../../models/Account";
import { Currency } from "../../models/Currency";
import { GraphQLEdge } from "../../models/GraphQLEdge";
import { Platform } from "../../models/Platform";

export type AccountData = {
  accounts: GraphQLEdge<Account>;
  platforms: GraphQLEdge<Platform>;
  currencies: GraphQLEdge<Currency>;
};

export type AccountOption = {
  id: string;
  name: string;
  account: Account;
  platforms: Platform[];
};

export function buildAccountOptions(data?: AccountData): AccountOption[] {
  if (!data) return [];
  const options: AccountOption[] = data.accounts.edges
    .filter(({ node }) => node.id)
    .map(({ node }) => ({ id: node.id!, name: "Overview", account: node, platforms: [] }));
  const groups = new Map<string, AccountOption>();

  data.platforms.edges.forEach(({ node: platform }) => {
    if (!platform.id || !platform.account?.id) return;
    const key = JSON.stringify([platform.account.id, platform.name]);
    let option = groups.get(key);
    if (!option) {
      option = {
        id: platform.id,
        name: platform.name ?? "",
        account: data.accounts.edges.find(({ node }) => node.id === platform.account?.id)?.node ?? platform.account,
        platforms: [],
      };
      groups.set(key, option);
    }
    option.platforms.push(platform);
  });

  groups.forEach((option) => {
    // Prefer a CAD platform ID for the broker selector, regardless of API order.
    // Links using any member platform ID still resolve to this broker group.
    option.platforms.sort((a, b) => {
      const currencyOrder = (a.currency?.code === "CAD" ? 0 : 1) - (b.currency?.code === "CAD" ? 0 : 1);
      return currencyOrder || (a.id ?? "").localeCompare(b.id ?? "");
    });
    option.id = option.platforms[0].id!;
    if (option.platforms.every(platform => platform.closedAt)) option.name += " (closed)";
    options.push(option);
  });
  return options;
}

export function findAccountOption(options: AccountOption[], id: string | null) {
  return options.find((option) => option.id === id || option.platforms.some((platform) => platform.id === id));
}

export function availableCurrencies(option: AccountOption, currencies: Currency[]) {
  return currencies.filter((currency) => currency.id && (
    option.platforms.length === 0 || option.platforms.some((platform) => platform.currency?.id === currency.id)
  ));
}

export function selectCurrency(option: AccountOption, currencies: Currency[], currencyId: string | null, accountId?: string | null) {
  const available = availableCurrencies(option, currencies);
  const linkedPlatform = option.platforms.find((platform) => platform.id === accountId);
  return available.find((currency) => currency.id === currencyId)
    ?? available.find((currency) => !currencyId && currency.id === linkedPlatform?.currency?.id)
    ?? available.find((currency) => currency.code === "CAD")
    ?? available[0];
}
