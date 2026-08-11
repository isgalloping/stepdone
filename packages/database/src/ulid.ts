import { ulid } from "ulid";

export function newPublicId(): string {
  return ulid();
}
