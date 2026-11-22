import { Request, Response, NextFunction } from "express";
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "ApiError"; }
}
export function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<unknown> | unknown) {
  return (req: Request, res: Response, next: NextFunction) => Promise.resolve().then(() => fn(req, res, next)).catch(next);
}
export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, "Rota não encontrada."));
}
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  let status = err instanceof ApiError ? err.status : 500;
  let message = err instanceof ApiError ? err.message : "Erro interno do servidor.";
  if (err?.type === "entity.parse.failed") { status = 400; message = "JSON inválido."; }
  if (err?.type === "entity.too.large") { status = 413; message = "Dados enviados excedem o limite."; }
  if (err?.code?.startsWith?.("SQLITE_CONSTRAINT_UNIQUE")) { status = 409; message = "Registro já existente."; }
  if (err?.code?.startsWith?.("SQLITE_CONSTRAINT_FOREIGNKEY")) { status = 409; message = "Relacionamento de dados inválido."; }
  if (err?.code?.startsWith?.("SQLITE_BUSY")) { status = 503; message = "Banco temporariamente ocupado. Tente novamente."; }
  if (status >= 500) console.error("Erro de API:", err);
  res.status(status).json({ error: message });
}
