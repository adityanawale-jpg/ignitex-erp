import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Opt-in: unset GCP_PROJECT_ID and this is a complete no-op — every env var
// keeps whatever the .env file / docker-compose environment already gave it,
// exactly as before this existed. Set it, and the two secrets that actually
// matter (DB password, JWT signing secret — both currently sit in plain text
// in .env files on Dev/UAT) get overwritten with values pulled from Secret
// Manager at container startup instead.
//
// Auth: relies on Application Default Credentials — on a GCE/GKE host this
// is the instance's attached service account with no key file needed. That
// service account needs the "Secret Manager Secret Accessor" IAM role on
// each secret below.
const SECRET_ENV_MAP: Record<string, string> = {
  DB_PASSWORD: 'db-password',
  JWT_SECRET: 'jwt-secret',
};

// Uses console, not the winston logger: this runs before any other module
// (including the logger's own setup) is imported, as the very first thing
// app.ts does.
export const loadSecretsFromGCP = async (): Promise<void> => {
  const projectId = process.env.GCP_PROJECT_ID;
  if (!projectId) return;

  const client = new SecretManagerServiceClient();

  await Promise.all(
    Object.entries(SECRET_ENV_MAP).map(async ([envVar, secretName]) => {
      try {
        const [version] = await client.accessSecretVersion({
          name: `projects/${projectId}/secrets/${secretName}/versions/latest`,
        });
        const value = version.payload?.data?.toString();
        if (value) {
          process.env[envVar] = value;
        } else {
          console.error(`GCP Secret Manager returned an empty payload for "${secretName}" — keeping existing ${envVar}.`);
        }
      } catch (error) {
        console.error(
          `Failed to load secret "${secretName}" from GCP Secret Manager — keeping existing ${envVar} env var. ${(error as Error).message}`,
        );
      }
    }),
  );
};
