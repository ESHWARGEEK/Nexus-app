import { GoogleAuth } from 'google-auth-library';

// Shared GoogleAuth instance configured with Cloud Platform scopes for Application Default Credentials
const googleAuth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

/**
 * Retrieves an active OAuth2 access token via Application Default Credentials (ADC).
 * Eliminates reliance on static tokens or environment bearer strings.
 */
export async function getADCAccessToken(): Promise<string | null> {
  try {
    const client = await googleAuth.getClient();
    const tokenResponse = await client.getAccessToken();
    return tokenResponse?.token || null;
  } catch (err: any) {
    // If ADC is unavailable in local sandbox environment, gracefully return null
    return null;
  }
}

/**
 * Retrieves the resolved Google Cloud Project ID from ADC or fallback configuration.
 */
export async function getADCProjectId(): Promise<string> {
  try {
    const projectId = await googleAuth.getProjectId();
    if (projectId && projectId !== 'demo-vertex-project') {
      return projectId;
    }
  } catch {
    // ignore
  }
  return process.env.PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'ai-builder-cup-511510';
}
