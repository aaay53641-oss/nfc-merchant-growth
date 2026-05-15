import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiErrorBody = {
  error: string;
  details?: unknown;
};

export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(error: string, status = 400, details?: unknown) {
    super(error);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function apiError(error: string, status = 400, details?: unknown) {
  const body: ApiErrorBody = details === undefined ? { error } : { error, details };

  return NextResponse.json(body, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof HttpError) {
    return apiError(error.message, error.status, error.details);
  }

  if (error instanceof ZodError) {
    return apiError("Invalid request body", 400, error.flatten());
  }

  console.error(error);
  return apiError("Internal server error", 500);
}
