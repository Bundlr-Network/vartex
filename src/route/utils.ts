import { Response } from "express";

export function makeError(response: Response, code: number, message?: string): Promise<void> {
    response.sendStatus(code);
    if (message) response.send(message);
    response.end();
    return;
}