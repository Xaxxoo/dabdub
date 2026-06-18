import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';

export interface GithubRepoData {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  default_branch: string;
  language: string | null;
  topics: string[];
  private: boolean;
  fork: boolean;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  subscribers_count: number;
  pushed_at: string | null;
  visibility: string;
}

export interface GithubIssueData {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  user: { login: string; avatar_url: string } | null;
  assignee: { login: string } | null;
  labels: Array<{ name: string }>;
  comments: number;
  pull_request?: unknown;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GithubPRData {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  head: { ref: string; sha: string };
  base: { ref: string };
  user: { login: string; avatar_url: string } | null;
  merged_by: { login: string } | null;
  labels: Array<{ name: string }>;
  requested_reviewers: Array<{ login: string }>;
  comments: number;
  review_comments: number;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  merged_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GithubContributorData {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

export interface GithubOrgData {
  id: number;
  login: string;
  name: string | null;
  description: string | null;
  avatar_url: string;
  html_url: string;
  blog: string | null;
  location: string | null;
  email: string | null;
  twitter_username: string | null;
  public_repos: number;
  total_private_repos: number;
  members_count: number;
  has_organization_projects: boolean;
  has_repository_projects: boolean;
}

export interface GithubTeamData {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  privacy: string;
  permission: string;
  members_count: number;
  repos_count: number;
  html_url: string;
  parent: { id: number } | null;
}

export interface GithubUserData {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
}

@Injectable()
export class GithubApiClient {
  private readonly logger = new Logger(GithubApiClient.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Create an Octokit instance authenticated with a user's token.
   */
  forToken(token: string): Octokit {
    return new Octokit({ auth: token });
  }

  /**
   * Create an unauthenticated Octokit instance (60 req/hr rate limit).
   */
  anonymous(): Octokit {
    return new Octokit();
  }

  /**
   * Fetch full repository metadata from GitHub.
   */
  async getRepository(
    owner: string,
    repo: string,
    token?: string,
  ): Promise<GithubRepoData> {
    const octokit = token ? this.forToken(token) : this.anonymous();
    const { data } = await octokit.repos.get({ owner, repo });
    return data as GithubRepoData;
  }

  /**
   * Fetch all open and closed issues (not PRs) with pagination.
   * Uses since parameter for incremental sync.
   */
  async getIssues(
    owner: string,
    repo: string,
    token?: string,
    since?: Date,
  ): Promise<GithubIssueData[]> {
    const octokit = token ? this.forToken(token) : this.anonymous();
    const issues: GithubIssueData[] = [];
    let page = 1;

    while (true) {
      const { data } = await octokit.issues.listForRepo({
        owner,
        repo,
        state: 'all',
        per_page: 100,
        page,
        ...(since ? { since: since.toISOString() } : {}),
      });

      if (data.length === 0) break;
      issues.push(...(data as unknown as GithubIssueData[]));
      if (data.length < 100) break;
      page++;
    }

    return issues;
  }

  /**
   * Fetch all pull requests with pagination.
   */
  async getPullRequests(
    owner: string,
    repo: string,
    token?: string,
    since?: Date,
  ): Promise<GithubPRData[]> {
    const octokit = token ? this.forToken(token) : this.anonymous();
    const prs: GithubPRData[] = [];
    let page = 1;

    while (true) {
      const { data } = await octokit.pulls.list({
        owner,
        repo,
        state: 'all',
        per_page: 100,
        page,
        sort: 'updated',
        direction: 'desc',
      });

      if (data.length === 0) break;
      // If syncing incrementally, stop when we pass `since`
      if (since) {
        const filtered = data.filter(
          (pr) => new Date(pr.updated_at) >= since,
        );
        prs.push(...(filtered as unknown as GithubPRData[]));
        if (filtered.length < data.length) break;
      } else {
        prs.push(...(data as unknown as GithubPRData[]));
      }
      if (data.length < 100) break;
      page++;
    }

    return prs;
  }

  /**
   * Fetch top contributors for a repository.
   */
  async getContributors(
    owner: string,
    repo: string,
    token?: string,
  ): Promise<GithubContributorData[]> {
    const octokit = token ? this.forToken(token) : this.anonymous();
    const contributors: GithubContributorData[] = [];
    let page = 1;

    while (true) {
      const { data } = await octokit.repos.listContributors({
        owner,
        repo,
        per_page: 100,
        page,
        anon: 'false',
      });

      if (data.length === 0) break;
      contributors.push(...(data as unknown as GithubContributorData[]));
      if (data.length < 100) break;
      page++;
    }

    return contributors;
  }

  /**
   * Fetch language breakdown for a repository.
   */
  async getLanguages(
    owner: string,
    repo: string,
    token?: string,
  ): Promise<Record<string, number>> {
    const octokit = token ? this.forToken(token) : this.anonymous();
    const { data } = await octokit.repos.listLanguages({ owner, repo });
    return data as Record<string, number>;
  }

  /**
   * Fetch GitHub organization metadata.
   */
  async getOrganization(
    orgLogin: string,
    token?: string,
  ): Promise<GithubOrgData> {
    const octokit = token ? this.forToken(token) : this.anonymous();
    const { data } = await octokit.orgs.get({ org: orgLogin });
    return data as unknown as GithubOrgData;
  }

  /**
   * Fetch teams for a GitHub organization.
   */
  async getOrganizationTeams(
    orgLogin: string,
    token: string,
  ): Promise<GithubTeamData[]> {
    const octokit = this.forToken(token);
    const teams: GithubTeamData[] = [];
    let page = 1;

    while (true) {
      const { data } = await octokit.teams.list({
        org: orgLogin,
        per_page: 100,
        page,
      });

      if (data.length === 0) break;
      teams.push(...(data as unknown as GithubTeamData[]));
      if (data.length < 100) break;
      page++;
    }

    return teams;
  }

  /**
   * Fetch repos accessible to a GitHub App installation.
   */
  async getInstallationRepositories(
    token: string,
  ): Promise<GithubRepoData[]> {
    const octokit = this.forToken(token);
    const repos: GithubRepoData[] = [];
    let page = 1;

    while (true) {
      const { data } = await octokit.apps.listReposAccessibleToInstallation({
        per_page: 100,
        page,
      });

      if (data.repositories.length === 0) break;
      repos.push(...(data.repositories as unknown as GithubRepoData[]));
      if (data.repositories.length < 100) break;
      page++;
    }

    return repos;
  }

  /**
   * Get authenticated user info.
   */
  async getAuthenticatedUser(token: string): Promise<GithubUserData> {
    const octokit = this.forToken(token);
    const { data } = await octokit.users.getAuthenticated();
    return data as unknown as GithubUserData;
  }

  /**
   * Fetch repos the authenticated user has access to.
   */
  async getUserRepositories(token: string): Promise<GithubRepoData[]> {
    const octokit = this.forToken(token);
    const repos: GithubRepoData[] = [];
    let page = 1;

    while (true) {
      const { data } = await octokit.repos.listForAuthenticatedUser({
        per_page: 100,
        page,
        sort: 'updated',
        direction: 'desc',
      });

      if (data.length === 0) break;
      repos.push(...(data as unknown as GithubRepoData[]));
      if (data.length < 100) break;
      page++;
    }

    return repos;
  }

  /**
   * Fetch organizations the authenticated user belongs to.
   */
  async getUserOrganizations(
    token: string,
  ): Promise<Array<{ id: number; login: string; avatar_url: string }>> {
    const octokit = this.forToken(token);
    const { data } = await octokit.orgs.listForAuthenticatedUser({
      per_page: 100,
    });
    return data as Array<{ id: number; login: string; avatar_url: string }>;
  }

  /**
   * Parse owner and repo from a full_name string (owner/repo).
   */
  parseFullName(fullName: string): { owner: string; repo: string } {
    const parts = fullName.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid GitHub full name: ${fullName}`);
    }
    return { owner: parts[0], repo: parts[1] };
  }
}
