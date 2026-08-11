import { newPublicId } from "@stepdone/database";
import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(
    { success: true, data, requestId: newPublicId() },
    init,
  );
}

export function jsonErr(
  code: string,
  message: string,
  status = 400,
  retryable = false,
  details?: unknown,
) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, retryable, ...(details !== undefined ? { details } : {}) },
      requestId: newPublicId(),
    },
    { status },
  );
}
