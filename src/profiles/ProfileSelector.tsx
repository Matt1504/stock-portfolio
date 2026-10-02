import { PlusOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation } from "@apollo/client";
import { Alert, Button, Form, Input, Modal, Select, Space, Typography } from "antd";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CREATE_PROFILE, GET_PROFILES } from "./gql";
import { Profile, useProfile } from "./ProfileContext";

export default function ProfileSelector() {
  const { profiles, profile, selectProfile, loading, error } = useProfile();
  const [open, setOpen] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [form] = Form.useForm();
  const [create, { loading: saving }] = useMutation<{ createProfile: { profile: Profile } }>(CREATE_PROFILE);
  const location = useLocation();
  const navigate = useNavigate();
  const close = () => { if (!saving) { setOpen(false); form.resetFields(); setSaveError(undefined); } };
  const save = async ({ name }: { name: string }) => {
    if (saving) return;
    setSaveError(undefined);
    try {
      const result = await create({ variables: { name: name.trim() }, refetchQueries: [GET_PROFILES], awaitRefetchQueries: true });
      const added = result.data?.createProfile.profile;
      if (!added) throw new Error("No profile returned");
      const next = new URLSearchParams(location.search);
      next.set("profile", added.id);
      next.delete("account"); next.delete("currency");
      navigate({ pathname: location.pathname, search: next.toString() });
      setOpen(false); form.resetFields();
    } catch { setSaveError("Could not create the profile. Please try again."); }
  };
  return <>
    <Space wrap className="profile-controls">
      <UserOutlined aria-hidden />
      <Select aria-label="Active profile" placeholder="Select profile" value={profile?.id} loading={loading} disabled={loading || !!error}
        style={{ width: 180 }} options={profiles.map(item => ({ value: item.id, label: item.name }))} onChange={selectProfile} />
      <Button icon={<PlusOutlined aria-hidden />} onClick={() => setOpen(true)} disabled={loading || !!error}>Add Profile</Button>
    </Space>
    <Modal title="Add Profile" open={open} onCancel={close} onOk={() => form.submit()} okText="Create Profile" confirmLoading={saving}
      cancelButtonProps={{ disabled: saving }} closable={!saving} maskClosable={!saving} keyboard={!saving}>
      <Typography.Paragraph type="secondary">Track another person's accounts and transactions separately. Stocks and account types are shared.</Typography.Paragraph>
      {saveError && <Alert type="error" showIcon message={saveError} style={{ marginBottom: 20 }} />}
      <Form form={form} layout="vertical" onFinish={save} disabled={saving}>
        <Form.Item name="name" label="Profile name" rules={[{ required: true, whitespace: true, message: "Enter a profile name." }, { max: 100, message: "Use 100 characters or fewer." }]}>
          <Input autoFocus maxLength={100} placeholder="e.g. Matthew" />
        </Form.Item>
      </Form>
    </Modal>
  </>;
}
