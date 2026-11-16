import { register, type FirebaseCredentials, type RegisterCredentials } from './register.js';

export async function registerMany(
  projects: FirebaseCredentials[],
): Promise<RegisterCredentials[]> {
  return Promise.all(projects.map((project) => register(project)));
}
