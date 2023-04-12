import { Button, Modal, Select } from "antd";
import React, { useEffect, useState } from "react";

import { ArrowDownOutlined } from "@ant-design/icons";
import { useMutation } from "@apollo/client";
import { CircularProgress, Stack } from "@mui/material";

import { NotificationComponent } from "../../components/Notification";
import { Account } from "../../models/Account";
import { GraphQLNode } from "../../models/GraphQLNode";
import { Platform } from "../../models/Platform";
import { TRANSFER_ACCOUNT } from "./gql";

type TAMProps = {
  platforms: GraphQLNode<Platform>[];
  accounts: GraphQLNode<Account>[];
  notification: NotificationComponent;
};

const TransferAccountModal = (props: TAMProps) => {
  const { platforms, accounts, notification } = props;
  const [transferFrom, setTransferFrom] = useState<GraphQLNode<Platform>>();
  const [transferTo, setTransferTo] = useState<
    GraphQLNode<Platform> | undefined
  >();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [transferAccount, { data, error, loading }] = useMutation(
    TRANSFER_ACCOUNT,
    {
      update: (cache: any, mutationResult: any) => {
        if (!mutationResult.data.transferAccount.success) {
          notification.openNotificationWithIcon(
            "error",
            "Error Transferring Account",
            "The account could not be transferred. Please try again."
          );
        } else {
          notification.openNotificationWithIcon(
            "success",
            "Account Transferred",
            "Account has been successfully transferred. Please Refresh if necessary"
          );
          setIsModalOpen(false);
        }
      },
    }
  );

  const handleTransferFrom = (value: string) => {
    let index = platforms.findIndex(
      (x: GraphQLNode<Platform>) => x.node.id === value
    );
    if (index === -1) return;
    var platform = platforms[index];
    setTransferFrom(platform);
    setTransferTo(undefined);
  };

  const handlTransferTo = (value: string) => {
    let index = platforms.findIndex(
      (x: GraphQLNode<Platform>) => x.node.id === value
    );
    if (index === -1) return;
    var platform = platforms[index];
    setTransferTo(platform);
  };

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = async () => {
    if (!transferFrom || !transferTo) {
      notification.openNotificationWithIcon(
        "warning",
        "Invalid Account",
        "There must be an account to transfer from and to in order for a successful transfer."
      );
      return;
    }
    await transferAccount({
      variables: {
        transferFrom: transferFrom?.node.id,
        transferTo: transferTo?.node.id,
      },
    });
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  useEffect(() => {
    setTransferFrom(undefined);
    setTransferTo(undefined);
  }, [isModalOpen]);

  return (
    <>
      <Button type="primary" onClick={showModal}>
        Transfer
      </Button>
      <Modal
        title="Transfer Account"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <p>Transfers must be between accounts and the same currency.</p>
        <p>
          By transferring, all holdings will be moved to the specified account
          platform, leaving the initial platform account empty.
        </p>
        <p>Account: {transferFrom?.node.account?.code}</p>
        <Stack
          direction="column"
          justifyContent="center"
          alignItems="center"
          spacing={2}
        >
          <Select
            showSearch
            placeholder="Platform Transferring From"
            filterOption={(input, option: any) =>
              (option?.label ?? "").toLowerCase().includes(input)
            }
            optionFilterProp="children"
            style={{ width: 400 }}
            value={transferFrom?.node.id}
            onChange={handleTransferFrom}
            options={accounts?.map((account: GraphQLNode<Account>) => ({
              label: account.node.code,
              options: platforms
                ?.filter(
                  (platform: GraphQLNode<Platform>) =>
                    account.node.code === platform.node.account?.code
                )
                .map((x: GraphQLNode<Platform>) => ({
                  value: x.node.id,
                  label: `${x.node.name} (${x.node.currency?.code})`,
                })),
            }))}
          />
          <ArrowDownOutlined />
          <Select
            showSearch
            placeholder="Platform Transferring To"
            filterOption={(input, option: any) =>
              (option?.label ?? "").toLowerCase().includes(input)
            }
            disabled={!transferFrom}
            style={{ width: 400 }}
            value={transferTo?.node.id}
            onChange={handlTransferTo}
            optionFilterProp="children"
            options={accounts
              ?.filter(
                (account: GraphQLNode<Account>) =>
                  !transferFrom ||
                  account.node.id === transferFrom?.node.account?.id
              )
              .map((account: GraphQLNode<Account>) => ({
                label: account.node.code,
                options: platforms
                  ?.filter(
                    (platform: GraphQLNode<Platform>) =>
                      account.node.code === platform.node.account?.code &&
                      (!transferFrom ||
                        (transferFrom?.node.currency?.code ===
                          platform?.node.currency?.code &&
                          transferFrom.node.id !== platform?.node.id))
                  )
                  .map((x: GraphQLNode<Platform>) => ({
                    value: x.node.id,
                    label: `${x.node.name} (${x.node.currency?.code})`,
                  })),
              }))}
          />
          {loading && <CircularProgress />}
        </Stack>
      </Modal>
    </>
  );
};

export default TransferAccountModal;
