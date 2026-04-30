import { Account, Client, OAuthProvider, type Models } from 'appwrite';

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '69eb236d0037072f2c92';
const projectName = import.meta.env.VITE_APPWRITE_PROJECT_NAME || 'Edify';

const client = new Client();

client.setEndpoint(endpoint).setProject(projectId);

const account = new Account(client);

export type AppwriteUser = Models.User<Models.Preferences>;

export const appwriteConfig = {
  endpoint,
  projectId,
  projectName,
  ready: Boolean(endpoint && projectId)
};

export async function getCurrentUser(): Promise<AppwriteUser> {
  return account.get();
}

export type AppwriteOAuthProvider = 'google' | 'github' | 'microsoft';

const providerMap: Record<AppwriteOAuthProvider, OAuthProvider> = {
  google: OAuthProvider.Google,
  github: OAuthProvider.Github,
  microsoft: OAuthProvider.Microsoft
};

export async function signInWithProvider(provider: AppwriteOAuthProvider) {
  if (window.location.protocol === 'file:') {
    throw new Error('OAuth sign-in needs localhost or a real domain. It cannot start from a file:// page.');
  }

  const success = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  const failure = success;

  account.createOAuth2Session({
    provider: providerMap[provider],
    success,
    failure
  });
}

export async function signOutCurrentUser() {
  await account.deleteSession({ sessionId: 'current' });
}
