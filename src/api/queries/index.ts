import { readFileSync } from "fs";
import { join } from "path";

/**
 * Loads a GraphQL query from a .gql file
 */
const loadQuery = (filename: string): string => {
  const queryPath = join(__dirname, filename);
  return readFileSync(queryPath, "utf-8").trim();
};

// Export all GraphQL queries
export const FETCH_USERS_QUERY = loadQuery("fetchUsers.gql");
export const FETCH_GROUPS_QUERY = loadQuery("fetchGroups.gql");
export const FETCH_PROJECTS_QUERY = loadQuery("fetchProjects.gql");
export const FETCH_GROUP_PROJECTS_QUERY = loadQuery("fetchGroupProjects.gql");
export const FETCH_SUBGROUPS_QUERY = loadQuery("fetchSubgroups.gql");
export const FETCH_GROUP_QUERY = loadQuery("fetchGroup.gql");
export const FETCH_PROJECT_QUERY = loadQuery("fetchProject.gql");
