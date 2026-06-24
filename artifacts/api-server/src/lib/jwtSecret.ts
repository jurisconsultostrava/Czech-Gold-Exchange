const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;

if (!secret) {
  throw new Error(
    "Missing JWT signing secret: set JWT_SECRET or SESSION_SECRET in the environment.",
  );
}

export const JWT_SECRET: string = secret;
