import { NextResponse } from "next/server";

export type ApiError = {
  error: string;
  code: string;
  message: string;
};

export function apiError(
  message: string,
  code: string,
  status: number = 400
): NextResponse<ApiError> {
  return NextResponse.json({ error: "error", code, message }, { status });
}

export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function unauthorized() {
  return apiError("Unauthorized", "UNAUTHORIZED", 401);
}

export function forbidden() {
  return apiError("Forbidden", "FORBIDDEN", 403);
}

export function notFound(resource = "Resource") {
  return apiError(`${resource} not found`, "NOT_FOUND", 404);
}

export function conflict(message: string) {
  return apiError(message, "CONFLICT", 409);
}

export function serverError(message = "Internal server error") {
  return apiError(message, "INTERNAL_ERROR", 500);
}
