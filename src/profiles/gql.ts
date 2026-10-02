import { gql } from "@apollo/client";

export const GET_PROFILES = gql`
  query Profiles { profiles { edges { node { id name } } } }
`;
export const CREATE_PROFILE = gql`
  mutation CreateProfile($name: String!) {
    createProfile(name: $name) { profile { id name } }
  }
`;
