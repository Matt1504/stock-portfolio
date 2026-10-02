import { createContext, ReactNode, useContext, useEffect } from "react";
import { useQuery } from "@apollo/client";
import { Alert, Button, Space } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import LoadingProgress from "../components/LoadingProgress";
import { GET_PROFILES } from "./gql";

export type Profile = { id: string; name: string };
export type ProfileScope = { profiles: Profile[]; profile?: Profile; selectProfile: (id: string) => void; loading: boolean; refetch: () => Promise<unknown>; error?: Error };
export const ProfileContext = createContext<ProfileScope | null>(null);
export const PROFILE_STORAGE_KEY = "stock-portfolio-profile";

function rememberedProfile(): string | null {
  try { return localStorage.getItem(PROFILE_STORAGE_KEY); } catch { return null; }
}
function rememberProfile(id: string) {
  try { localStorage.setItem(PROFILE_STORAGE_KEY, id); } catch { /* URL still persists the selection. */ }
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("ProfileProvider is required");
  return context;
}

export default function ProfileProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refetch } = useQuery<{ profiles: { edges: { node: Profile }[] } }>(GET_PROFILES);
  const location = useLocation();
  const navigate = useNavigate();
  const profiles = data?.profiles.edges.map(({ node }) => node) ?? [];
  const params = new URLSearchParams(location.search);
  const requestedId = params.get("profile");
  // An invalid explicit link never silently opens somebody else's records.
  const profile = requestedId ? profiles.find(item => item.id === requestedId)
    : profiles.find(item => item.id === rememberedProfile()) ?? profiles[0];

  const selectProfile = (id: string) => {
    if (!profiles.some(item => item.id === id)) return;
    const next = new URLSearchParams(location.search);
    next.set("profile", id);
    // Stock definitions are shared; brokerage selections belong to a person.
    next.delete("account");
    next.delete("currency");
    navigate({ pathname: location.pathname, search: next.toString() });
  };

  const selectedProfileId = profile?.id;
  useEffect(() => {
    if (!selectedProfileId) return;
    rememberProfile(selectedProfileId);
    if (!requestedId) {
      const next = new URLSearchParams(location.search);
      next.set("profile", selectedProfileId);
      navigate({ pathname: location.pathname, search: next.toString() }, { replace: true });
    }
  }, [selectedProfileId, requestedId, location.pathname, location.search, navigate]);

  return <ProfileContext.Provider value={{ profiles, profile, selectProfile, loading, refetch, error }}>
    {children}
  </ProfileContext.Provider>;
}

export function ProfileContent({ children }: { children: ReactNode }) {
  const { loading, error, profile, profiles, refetch } = useProfile();
  if (loading && !profiles.length) return <LoadingProgress />;
  if (error) return <Alert type="error" showIcon message="Unable to load profiles" description={<Space direction="vertical"><span>Check that the backend is running with profile support.</span><Button onClick={() => void refetch()}>Try again</Button></Space>} />;
  if (!profile) return <Alert type={profiles.length ? "warning" : "info"} showIcon
    message={profiles.length ? "This profile could not be found" : "Create your first profile"}
    description={profiles.length ? "Select a profile in the header to continue." : "Use Add Profile above to start a new portfolio. If you have existing records, run the profile migration first to assign them to their owner."} />;
  // Remount on ownership changes: forms, table filters and pending dialogs
  // cannot retain personal state from the previous profile.
  return <div key={profile.id}>{children}</div>;
}
