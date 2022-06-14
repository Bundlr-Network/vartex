import { Response } from "express";

export function makeError(response: Response, code: number, message?: string): Promise<void> {
    response.status(code).send(message).end();
    return;
}